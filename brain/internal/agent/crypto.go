package agent

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const (
	encryptionPrefix = "enc:v1:"
	nonceSize        = 12 // 96-bit standard nonce for AES-GCM
	keySize          = 32 // 256-bit key for AES-256
)

var (
	masterKeyMu sync.RWMutex
	cachedKey   []byte
)

// masterKeyPath returns the path to the master key file, co-located with settings.json.
func masterKeyPath() string {
	dir := filepath.Dir(settingsPath())
	return filepath.Join(dir, ".master.key")
}

// resetMasterKeyCache clears the cached key from memory (used in testing).
func resetMasterKeyCache() {
	masterKeyMu.Lock()
	defer masterKeyMu.Unlock()
	cachedKey = nil
}

// getMasterKey returns a 32-byte master key.
// Priority 1: PUTMEIN_ENCRYPTION_KEY environment variable.
// Priority 2: ~/.config/putmein/.master.key file (auto-generated if missing with 0600 permissions).
func getMasterKey() ([]byte, error) {
	masterKeyMu.RLock()
	if len(cachedKey) == keySize {
		defer masterKeyMu.RUnlock()
		return cachedKey, nil
	}
	masterKeyMu.RUnlock()

	masterKeyMu.Lock()
	defer masterKeyMu.Unlock()

	// Double check after acquiring write lock
	if len(cachedKey) == keySize {
		return cachedKey, nil
	}

	// 1. Check environment variable override
	if envKey := strings.TrimSpace(os.Getenv("PUTMEIN_ENCRYPTION_KEY")); envKey != "" {
		h := sha256.Sum256([]byte(envKey))
		cachedKey = make([]byte, keySize)
		copy(cachedKey, h[:])
		return cachedKey, nil
	}

	// 2. Check key file
	kPath := masterKeyPath()
	if data, err := os.ReadFile(kPath); err == nil {
		data = []byte(strings.TrimSpace(string(data)))
		if len(data) == keySize {
			cachedKey = make([]byte, keySize)
			copy(cachedKey, data)
			return cachedKey, nil
		}
		if decoded, err := base64.StdEncoding.DecodeString(string(data)); err == nil && len(decoded) == keySize {
			cachedKey = decoded
			return cachedKey, nil
		}
		// If raw length is arbitrary, hash to 32 bytes
		h := sha256.Sum256(data)
		cachedKey = make([]byte, keySize)
		copy(cachedKey, h[:])
		return cachedKey, nil
	}

	// 3. Generate new random 32-byte key
	newKey := make([]byte, keySize)
	if _, err := io.ReadFull(rand.Reader, newKey); err != nil {
		return nil, fmt.Errorf("failed to generate random master key: %w", err)
	}

	// Ensure config directory exists with 0700 permissions
	dir := filepath.Dir(kPath)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %w", err)
	}
	_ = os.Chmod(dir, 0o700)

	// Persist base64-encoded master key with strict 0600 permissions
	encoded := base64.StdEncoding.EncodeToString(newKey)
	if err := os.WriteFile(kPath, []byte(encoded+"\n"), 0o600); err != nil {
		return nil, fmt.Errorf("failed to write master key file: %w", err)
	}
	_ = os.Chmod(kPath, 0o600)

	cachedKey = newKey
	return cachedKey, nil
}

// encryptSecret encrypts a plaintext string using AES-256-GCM and returns "enc:v1:<base64>".
func encryptSecret(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	// Already encrypted
	if strings.HasPrefix(plaintext, encryptionPrefix) {
		return plaintext, nil
	}

	key, err := getMasterKey()
	if err != nil {
		return "", fmt.Errorf("cannot resolve master key for encryption: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Seal appends ciphertext and 16-byte authentication tag to nonce
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return encryptionPrefix + base64.StdEncoding.EncodeToString(sealed), nil
}

// decryptSecret decrypts a string if it starts with "enc:v1:".
// If the string is legacy plaintext (does not start with "enc:v1:"), it is returned as-is.
func decryptSecret(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}
	// Legacy plaintext support: if not prefixed, return as-is
	if !strings.HasPrefix(ciphertext, encryptionPrefix) {
		return ciphertext, nil
	}

	raw := strings.TrimPrefix(ciphertext, encryptionPrefix)
	data, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		return "", fmt.Errorf("invalid base64 ciphertext: %w", err)
	}

	key, err := getMasterKey()
	if err != nil {
		return "", fmt.Errorf("cannot resolve master key for decryption: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	if len(data) < gcm.NonceSize() {
		return "", errors.New("ciphertext too short")
	}

	nonce := data[:gcm.NonceSize()]
	actualCiphertext := data[gcm.NonceSize():]

	plaintextBytes, err := gcm.Open(nil, nonce, actualCiphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decryption failed (invalid key or corrupted data): %w", err)
	}

	return string(plaintextBytes), nil
}

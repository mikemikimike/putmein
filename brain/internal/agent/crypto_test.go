package agent

import (
	"os"
	"strings"
	"testing"
)

func TestEncryptDecryptSecret(t *testing.T) {
	resetMasterKeyCache()
	defer resetMasterKeyCache()

	rawKey := "sk-ant-api03-test-token-1234567890abcdef"

	encrypted, err := encryptSecret(rawKey)
	if err != nil {
		t.Fatalf("encryptSecret failed: %v", err)
	}

	if !strings.HasPrefix(encrypted, encryptionPrefix) {
		t.Fatalf("expected prefix %q, got %q", encryptionPrefix, encrypted)
	}

	if encrypted == rawKey {
		t.Fatal("encrypted text must not match plaintext")
	}

	// Encrypting twice should produce different outputs due to random nonces
	encrypted2, err := encryptSecret(rawKey)
	if err != nil {
		t.Fatalf("encryptSecret second run failed: %v", err)
	}
	if encrypted == encrypted2 {
		t.Fatal("expected distinct nonces and ciphertexts across invocations")
	}

	// Decrypt
	decrypted, err := decryptSecret(encrypted)
	if err != nil {
		t.Fatalf("decryptSecret failed: %v", err)
	}
	if decrypted != rawKey {
		t.Fatalf("expected decrypted %q, got %q", rawKey, decrypted)
	}

	// Empty string test
	emptyEnc, err := encryptSecret("")
	if err != nil || emptyEnc != "" {
		t.Fatalf("expected empty result for empty input, got %q, err %v", emptyEnc, err)
	}
	emptyDec, err := decryptSecret("")
	if err != nil || emptyDec != "" {
		t.Fatalf("expected empty result for empty input, got %q, err %v", emptyDec, err)
	}
}

func TestLegacyPlaintextSupport(t *testing.T) {
	resetMasterKeyCache()
	defer resetMasterKeyCache()

	plaintext := "sk-or-v1-legacy-openrouter-key"
	decrypted, err := decryptSecret(plaintext)
	if err != nil {
		t.Fatalf("decryptSecret failed on legacy plaintext: %v", err)
	}
	if decrypted != plaintext {
		t.Fatalf("expected untouched legacy plaintext %q, got %q", plaintext, decrypted)
	}
}

func TestTamperDetection(t *testing.T) {
	resetMasterKeyCache()
	defer resetMasterKeyCache()

	rawKey := "sk-openai-secret-sample"
	encrypted, err := encryptSecret(rawKey)
	if err != nil {
		t.Fatalf("encryptSecret failed: %v", err)
	}

	// Corrupt a character in the ciphertext
	corrupted := encrypted[:len(encrypted)-4] + "AAAA"
	_, err = decryptSecret(corrupted)
	if err == nil {
		t.Fatal("expected decryption error for tampered ciphertext, got nil")
	}
}

func TestEnvKeyOverride(t *testing.T) {
	resetMasterKeyCache()
	defer resetMasterKeyCache()

	originalEnv := os.Getenv("PUTMEIN_ENCRYPTION_KEY")
	defer func() {
		os.Setenv("PUTMEIN_ENCRYPTION_KEY", originalEnv)
		resetMasterKeyCache()
	}()

	os.Setenv("PUTMEIN_ENCRYPTION_KEY", "custom-secret-key-12345")
	resetMasterKeyCache()

	rawKey := "sk-custom-test-key"
	encrypted, err := encryptSecret(rawKey)
	if err != nil {
		t.Fatalf("encryptSecret with env var failed: %v", err)
	}

	decrypted, err := decryptSecret(encrypted)
	if err != nil {
		t.Fatalf("decryptSecret with env var failed: %v", err)
	}
	if decrypted != rawKey {
		t.Fatalf("expected %q, got %q", rawKey, decrypted)
	}
}

func TestSetAndGetAPIKeys(t *testing.T) {
	tmpDir := t.TempDir()
	customPath := tmpDir + "/settings.json"
	t.Setenv("PUTMEIN_CONFIG_PATH", customPath)

	resetMasterKeyCache()
	defer resetMasterKeyCache()

	testKeys := map[string]string{
		"openai": "sk-proj-test-12345",
		"claude": "sk-ant-test-67890",
	}

	SetAPIKeys(testKeys)

	saved := GetSavedAPIKeys()
	if saved["openai"] != testKeys["openai"] {
		t.Fatalf("expected openai key %q, got %q", testKeys["openai"], saved["openai"])
	}
	if saved["claude"] != testKeys["claude"] {
		t.Fatalf("expected claude key %q, got %q", testKeys["claude"], saved["claude"])
	}

	// Verify disk format has enc:v1:
	data, err := os.ReadFile(customPath)
	if err != nil {
		t.Fatalf("failed to read settings file: %v", err)
	}
	content := string(data)
	if !strings.Contains(content, "enc:v1:") {
		t.Fatalf("expected settings file to contain encrypted values with 'enc:v1:', got:\n%s", content)
	}
	if strings.Contains(content, "sk-proj-test-12345") {
		t.Fatalf("settings file must NOT contain plaintext key 'sk-proj-test-12345'")
	}

	// Verify file permissions are 0600
	info, err := os.Stat(customPath)
	if err != nil {
		t.Fatalf("os.Stat failed: %v", err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("expected file mode 0600, got %o", info.Mode().Perm())
	}
}

func TestLegacyMigrationAndPermissions(t *testing.T) {
	tmpDir := t.TempDir()
	customPath := tmpDir + "/settings.json"
	t.Setenv("PUTMEIN_CONFIG_PATH", customPath)

	resetMasterKeyCache()
	defer resetMasterKeyCache()

	// 1. Write legacy plaintext settings file with 0644 permissions
	legacyJSON := `{
  "autonomousMode": false,
  "apiKeys": {
    "openrouter": "sk-or-v1-legacy-secret-123"
  }
}`
	if err := os.WriteFile(customPath, []byte(legacyJSON), 0o644); err != nil {
		t.Fatalf("failed to write legacy settings: %v", err)
	}

	// 2. Load settings (which should detect plaintext, decrypt/retain it in memory, and re-save as encrypted)
	loadSettings()

	// 3. Verify in-memory key matches plaintext
	saved := GetSavedAPIKeys()
	if saved["openrouter"] != "sk-or-v1-legacy-secret-123" {
		t.Fatalf("expected migrated key 'sk-or-v1-legacy-secret-123', got %q", saved["openrouter"])
	}

	// 4. Verify disk was updated to encrypted format
	data, err := os.ReadFile(customPath)
	if err != nil {
		t.Fatalf("failed to read migrated settings file: %v", err)
	}
	migratedContent := string(data)
	if !strings.Contains(migratedContent, "enc:v1:") {
		t.Fatalf("expected migrated file to be encrypted with 'enc:v1:', got:\n%s", migratedContent)
	}
	if strings.Contains(migratedContent, "sk-or-v1-legacy-secret-123") {
		t.Fatalf("migrated settings file must not contain raw plaintext key")
	}

	// 5. Verify file permission tightened to 0600
	info, err := os.Stat(customPath)
	if err != nil {
		t.Fatalf("os.Stat failed: %v", err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("expected hardened permissions 0600, got %o", info.Mode().Perm())
	}
}



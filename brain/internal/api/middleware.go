package api

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"
)

// requireInternalSecret is an authentication middleware that verifies incoming requests
// contain the configured BRAIN_INTERNAL_SECRET via x-brain-secret, x-internal-secret, or Bearer token.
func requireInternalSecret(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		configuredSecret := os.Getenv("BRAIN_INTERNAL_SECRET")
		if configuredSecret == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"server configuration error: BRAIN_INTERNAL_SECRET not set"}`))
			return
		}

		// Check x-brain-secret
		incomingSecret := r.Header.Get("x-brain-secret")
		// Fallback to x-internal-secret
		if incomingSecret == "" {
			incomingSecret = r.Header.Get("x-internal-secret")
		}
		// Fallback to Authorization: Bearer <secret>
		if incomingSecret == "" {
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				incomingSecret = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if incomingSecret == "" || subtle.ConstantTimeCompare([]byte(incomingSecret), []byte(configuredSecret)) != 1 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"Unauthorized: invalid or missing brain secret"}`))
			return
		}

		next(w, r)
	}
}

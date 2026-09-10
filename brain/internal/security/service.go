package security

import (
	"context"
	"sync"
)

// Service provides high-level security management and in-memory scan tracking.
type Service struct {
	mu          sync.RWMutex
	recentScans map[string]*SecurityReport
	scanOrder   []string
}

var (
	defaultService     *Service
	defaultServiceOnce sync.Once
)

// DefaultService returns the singleton security service.
func DefaultService() *Service {
	defaultServiceOnce.Do(func() {
		defaultService = &Service{
			recentScans: make(map[string]*SecurityReport),
			scanOrder:   make([]string, 0),
		}
	})
	return defaultService
}

// ScanProject triggers an automated scan and stores the report.
func (s *Service) ScanProject(ctx context.Context, req ScanRequest) (*SecurityReport, error) {
	report, err := ExecuteScan(ctx, req)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.recentScans[report.ID] = report
	s.scanOrder = append([]string{report.ID}, s.scanOrder...)

	// Cap history to 50 in-memory reports
	if len(s.scanOrder) > 50 {
		oldID := s.scanOrder[len(s.scanOrder)-1]
		delete(s.recentScans, oldID)
		s.scanOrder = s.scanOrder[:50]
	}

	return report, nil
}

// GetScan retrieves a report by scan ID.
func (s *Service) GetScan(id string) (*SecurityReport, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	report, ok := s.recentScans[id]
	return report, ok
}

// ListRecentScans returns the list of recent scans in reverse chronological order.
func (s *Service) ListRecentScans() []*SecurityReport {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make([]*SecurityReport, 0, len(s.scanOrder))
	for _, id := range s.scanOrder {
		if r, ok := s.recentScans[id]; ok {
			res = append(res, r)
		}
	}
	return res
}

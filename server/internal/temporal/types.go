package temporal

import "github.com/datazip/olake-frontend/server/internal/docker"

// DockerCommandParams contains parameters for Docker commands (legacy)
type DockerCommandParams struct {
	SourceType string
	Version    string
	Config     string
	SourceID   int
	Command    string
}

// ActivityParams contains parameters for Docker command activities
type ActivityParams struct {
	SourceType    string
	Version       string
	Config        string
	SourceID      int
	Command       docker.Command
	DestConfig    string
	DestID        int
	WorkflowID    string
	StreamsConfig string
	Flag          string
}

// SyncParams contains parameters for sync activities
type SyncParams struct {
	JobID      int
	WorkflowID string
}

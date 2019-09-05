package extensions

import (
	"net/http"

	"github.com/gorilla/mux"
	httperror "github.com/portainer/libhttp/error"
	"github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/http/security"
)

// Handler is the HTTP handler used to handle extension operations.
type Handler struct {
	*mux.Router
	ExtensionService     portainer.ExtensionService
	ExtensionManager     portainer.ExtensionManager
	EndpointGroupService portainer.EndpointGroupService
	EndpointService      portainer.EndpointService
	RegistryService      portainer.RegistryService
}

// NewHandler creates a handler to manage extension operations.
func NewHandler(bouncer *security.RequestBouncer) *Handler {
	h := &Handler{
		Router: mux.NewRouter(),
	}

	h.Handle("/extensions",
		bouncer.AuthorizedAccess(httperror.LoggerHandler(h.extensionList))).Methods(http.MethodGet)
	h.Handle("/extensions",
		bouncer.AuthorizedAccess(httperror.LoggerHandler(h.extensionCreate))).Methods(http.MethodPost)
	h.Handle("/extensions/{id}",
		bouncer.AuthorizedAccess(httperror.LoggerHandler(h.extensionInspect))).Methods(http.MethodGet)
	h.Handle("/extensions/{id}",
		bouncer.AuthorizedAccess(httperror.LoggerHandler(h.extensionDelete))).Methods(http.MethodDelete)
	h.Handle("/extensions/{id}/update",
		bouncer.AuthorizedAccess(httperror.LoggerHandler(h.extensionUpdate))).Methods(http.MethodPost)

	return h
}

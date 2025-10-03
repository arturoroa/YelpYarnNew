import React from "react";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null; // No renderizar nada si no está autenticado
  }

  return <>{children}</>;
};

export default ProtectedRoute;
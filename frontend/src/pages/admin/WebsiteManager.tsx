import React from "react";
import { Redirect } from "wouter";

export default function WebsiteManager() {
  // Redirect /admin/website directly to the primary Pages & Visual Layout Studio route
  return <Redirect to="/admin/website/pages" replace />;
}

import { Outlet } from "@tanstack/react-router";
import { ContentPageHeaderTitle } from "./content-page-header";

export function ContentLayout() {
  return (
    <>
      <ContentPageHeaderTitle />
      <Outlet />
    </>
  );
}

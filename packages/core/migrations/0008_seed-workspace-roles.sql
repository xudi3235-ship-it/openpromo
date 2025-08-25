-- Custom SQL migration file, put your code below! --
INSERT INTO "workspace_roles" ("name", "slug") VALUES
  ('Admin', 'workspace_admin'),
  ('Editor', 'workspace_editor'),
  ('Viewer', 'workspace_viewer');

-- Create folders table
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '📁',
  color text not null default '#3b82f6',
  is_published boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create links table
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  url text not null,
  title text,
  description text,
  icon text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.folders enable row level security;
alter table public.links enable row level security;

-- Folders policies
create policy "users_view_own_folders"
  on public.folders for select
  using (auth.uid() = user_id);

create policy "users_view_published_folders"
  on public.folders for select
  using (is_published = true);

create policy "users_insert_own_folders"
  on public.folders for insert
  with check (auth.uid() = user_id);

create policy "users_update_own_folders"
  on public.folders for update
  using (auth.uid() = user_id);

create policy "users_delete_own_folders"
  on public.folders for delete
  using (auth.uid() = user_id);

-- Links policies (users can only manage links in their own folders)
create policy "users_view_links_in_own_folders"
  on public.links for select
  using (
    exists (
      select 1 from public.folders
      where folders.id = links.folder_id
      and folders.user_id = auth.uid()
    )
  );

create policy "users_view_links_in_published_folders"
  on public.links for select
  using (
    exists (
      select 1 from public.folders
      where folders.id = links.folder_id
      and folders.is_published = true
    )
  );

create policy "users_insert_links_in_own_folders"
  on public.links for insert
  with check (
    exists (
      select 1 from public.folders
      where folders.id = links.folder_id
      and folders.user_id = auth.uid()
    )
  );

create policy "users_update_links_in_own_folders"
  on public.links for update
  using (
    exists (
      select 1 from public.folders
      where folders.id = links.folder_id
      and folders.user_id = auth.uid()
    )
  );

create policy "users_delete_links_in_own_folders"
  on public.links for delete
  using (
    exists (
      select 1 from public.folders
      where folders.id = links.folder_id
      and folders.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
create index if not exists folders_user_id_idx on public.folders(user_id);
create index if not exists folders_is_published_idx on public.folders(is_published);
create index if not exists links_folder_id_idx on public.links(folder_id);

import { Outlet } from 'react-router';
import { AppSidebar, SidebarInset, SidebarProvider } from './sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <Header />
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

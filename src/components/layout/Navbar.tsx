"use client";

import { Sun, Moon, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const roleLabels = {
  manager: "Gerente",
  supervisor: "Supervisor",
  owner: "Dono(a)",
};

export function Navbar() {
  const { setTheme, theme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="bg-card shadow-sm border-b">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">
          Ordem de Pedidos - Confeitaria
        </h1>
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {user.name} ({roleLabels[user.role]})
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema</span>
          </Button>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </nav>
    </header>
  );
}

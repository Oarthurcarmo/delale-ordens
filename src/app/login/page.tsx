"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CakeSlice } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Decide se é email ou username
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.identifier);
      const payload = isEmail
        ? { email: formData.identifier, password: formData.password }
        : { username: formData.identifier, password: formData.password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.message || "Falha no login.");
      }
    } catch {
      setError("Ocorreu um erro ao tentar fazer login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:block">
        <div className="relative h-full w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1577387964004-597c17f5cc55?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Confeitaria"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 flex flex-col items-center text-white space-y-4">
            <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
              <CakeSlice className="w-12 h-12" />
            </div>
            <blockquote className="space-y-2 text-center max-w-md">
              <p className="text-lg font-medium">
                &quot;Transforme ingredientes em doces deliciosos com
                organização e precisão.&quot;
              </p>
              <footer className="text-sm text-zinc-200">Confeitaria</footer>
            </blockquote>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Ordens de Produção</h1>
            <p className="text-balance text-muted-foreground">
              Bem-vindo à sua confeitaria! Entre com seu email para gerenciar
              suas ordens de produção
            </p>
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="identifier">Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Usuário ou email"
                value={formData.identifier}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={formData.password}
                placeholder="*********"
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

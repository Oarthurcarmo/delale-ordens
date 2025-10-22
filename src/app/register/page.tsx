"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "manager",
    storeId: 1,
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    storeId: "",
    submit: "",
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: "",
      email: "",
      username: "",
      password: "",
      storeId: "",
      submit: "",
    };

    // Validação do nome
    if (formData.name.length < 3) {
      newErrors.name = "Nome deve ter pelo menos 3 caracteres";
      isValid = false;
    }

    // Validação do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Email inválido";
      isValid = false;
    }

    // Validação do username
    if (formData.username.length < 3) {
      newErrors.username = "Usuário deve ter pelo menos 3 caracteres";
      isValid = false;
    }

    // Validação da senha
    if (formData.password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
      isValid = false;
    }

    // Validação do ID da loja
    if (formData.storeId < 1) {
      newErrors.storeId = "ID da loja inválido";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    // Converte storeId para número
    const finalValue = id === "storeId" ? parseInt(value) || 1 : value;
    setFormData({ ...formData, [id]: finalValue });
    // Limpa o erro do campo quando ele é alterado
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, submit: "" }));

    if (!validateForm()) {
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      router.push("/login");
    } else {
      const data = await res.json();
      setErrors((prev) => ({
        ...prev,
        submit: data.message || "Falha no registro.",
      }));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cadastro de Usuário</CardTitle>
          <CardDescription>Crie uma nova conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeId">ID da Loja</Label>
              <Input
                id="storeId"
                type="number"
                value={formData.storeId}
                onChange={handleChange}
                required
              />
              {errors.storeId && (
                <p className="text-sm text-destructive">{errors.storeId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile">Perfil</Label>
              <Select
                onValueChange={handleRoleChange}
                defaultValue={formData.role}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Gerente de Loja</SelectItem>
                  <SelectItem value="supervisor">
                    Supervisor de Produção
                  </SelectItem>
                  <SelectItem value="owner">Dono(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {errors.submit && (
              <p className="text-sm text-destructive">{errors.submit}</p>
            )}
            <Button type="submit" className="w-full">
              Cadastrar
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{" "}
            <Link href="/login" className="underline">
              Faça o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

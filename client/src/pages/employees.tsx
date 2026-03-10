import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Camera, Fingerprint, Trash2, Edit, UserPlus, Users } from "lucide-react";
import type { Employee } from "@shared/schema";

function EmployeeForm({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    employeeCode: employee?.employeeCode || "",
    firstName: employee?.firstName || "",
    lastName: employee?.lastName || "",
    email: employee?.email || "",
    department: employee?.department || "",
    position: employee?.position || "",
    phone: employee?.phone || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (employee) {
        await apiRequest("PATCH", `/api/employees/${employee.id}`, data);
      } else {
        await apiRequest("POST", "/api/employees", { ...data, photoUrl: null, faceRegistered: false, fingerprintRegistered: false, active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: employee ? "Empleado actualizado" : "Empleado creado", description: "Los cambios se guardaron correctamente." });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employeeCode">Código</Label>
          <Input id="employeeCode" value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} required data-testid="input-employee-code" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required data-testid="input-employee-email" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required data-testid="input-employee-firstname" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required data-testid="input-employee-lastname" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Select value={form.department} onValueChange={val => setForm({ ...form, department: val })}>
            <SelectTrigger data-testid="select-department">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ingeniería">Ingeniería</SelectItem>
              <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
              <SelectItem value="Finanzas">Finanzas</SelectItem>
              <SelectItem value="Operaciones">Operaciones</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Ventas">Ventas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Cargo</Label>
          <Input id="position" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required data-testid="input-employee-position" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="input-employee-phone" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} data-testid="button-cancel-employee">Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending} data-testid="button-save-employee">
          {mutation.isPending ? "Guardando..." : employee ? "Actualizar" : "Crear Empleado"}
        </Button>
      </div>
    </form>
  );
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Empleado eliminado" });
    },
  });

  const filtered = employees?.filter(emp =>
    `${emp.firstName} ${emp.lastName} ${emp.employeeCode} ${emp.department}`.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingEmployee(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-employees-title">Empleados</h1>
          <p className="text-sm text-muted-foreground">{employees?.length ?? 0} empleados registrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} data-testid="button-add-employee">
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
            </DialogHeader>
            <EmployeeForm employee={editingEmployee} onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empleados..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-employees"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <Card key={emp.id} data-testid={`card-employee-${emp.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-sm">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(emp)} data-testid={`button-edit-${emp.id}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(emp.id)} data-testid={`button-delete-${emp.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground">{emp.position} — {emp.department}</p>
                  <p className="text-xs text-muted-foreground">{emp.email}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {emp.faceRegistered && (
                    <Badge variant="secondary" className="text-xs">
                      <Camera className="h-3 w-3 mr-1" /> Rostro
                    </Badge>
                  )}
                  {emp.fingerprintRegistered && (
                    <Badge variant="secondary" className="text-xs">
                      <Fingerprint className="h-3 w-3 mr-1" /> Huella
                    </Badge>
                  )}
                  {!emp.faceRegistered && !emp.fingerprintRegistered && (
                    <Badge variant="destructive" className="text-xs">Sin biometría</Badge>
                  )}
                  <Badge variant={emp.active ? "default" : "destructive"} className="text-xs">
                    {emp.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No se encontraron empleados</p>
          {search && <p className="text-sm text-muted-foreground mt-1">Intenta con otro término de búsqueda</p>}
        </div>
      )}
    </div>
  );
}

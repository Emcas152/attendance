import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Fingerprint, Clock, CalendarDays, Filter, ClipboardList } from "lucide-react";
import type { AttendanceRecord, Employee } from "@shared/schema";

export default function AttendancePage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (employeeFilter && employeeFilter !== "all") params.set("employeeId", employeeFilter);
    const qs = params.toString();
    return qs ? `/api/attendance?${qs}` : "/api/attendance";
  };

  const url = buildUrl();

  const { data: records, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: [url],
  });

  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const getEmployeeName = (id: string) => {
    const emp = employees?.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "—";
  };

  const getEmployeeCode = (id: string) => {
    const emp = employees?.find(e => e.id === id);
    return emp?.employeeCode ?? "—";
  };

  const getMethodDisplay = (method: string) => {
    if (method === "face") return (
      <div className="flex items-center gap-1.5">
        <Camera className="h-3.5 w-3.5 text-primary" />
        <span>Facial</span>
      </div>
    );
    if (method === "fingerprint") return (
      <div className="flex items-center gap-1.5">
        <Fingerprint className="h-3.5 w-3.5 text-emerald-500" />
        <span>Huella</span>
      </div>
    );
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Manual</span>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === "present") return <Badge variant="default">Presente</Badge>;
    if (status === "late") return <Badge variant="secondary">Tarde</Badge>;
    return <Badge variant="destructive">Ausente</Badge>;
  };

  const formatTime = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  };

  const calculateDuration = (checkIn: string | Date | null, checkOut: string | Date | null) => {
    if (!checkIn || !checkOut) return "—";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-attendance-title">Historial de Asistencia</h1>
        <p className="text-sm text-muted-foreground">Consulta y filtra los registros de asistencia</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Fecha
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                data-testid="input-date-filter"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Empleado
              </label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger data-testid="select-employee-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              onClick={() => { setDateFilter(today); setEmployeeFilter("all"); }}
              data-testid="button-reset-filters"
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Registros ({records?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : records && records.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(record => (
                    <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                      <TableCell className="font-medium">{getEmployeeName(record.employeeId)}</TableCell>
                      <TableCell className="text-muted-foreground">{getEmployeeCode(record.employeeId)}</TableCell>
                      <TableCell>{formatTime(record.checkIn)}</TableCell>
                      <TableCell>{formatTime(record.checkOut)}</TableCell>
                      <TableCell className="text-muted-foreground">{calculateDuration(record.checkIn, record.checkOut)}</TableCell>
                      <TableCell>{getMethodDisplay(record.method)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay registros para esta fecha</p>
              <p className="text-xs text-muted-foreground mt-1">Selecciona otra fecha o empleado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

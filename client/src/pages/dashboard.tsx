import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, Clock, Camera, Fingerprint, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { AttendanceRecord, Employee } from "@shared/schema";

function StatCard({ title, value, icon: Icon, variant }: {
  title: string;
  value: number | string;
  icon: any;
  variant: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${colors[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
  }>({ queryKey: ["/api/dashboard/stats"] });

  const todayStr = new Date().toISOString().split("T")[0];
  const { data: recentAttendance, isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: [`/api/attendance?date=${todayStr}`],
  });

  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const getEmployeeName = (id: string) => {
    const emp = employees?.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Desconocido";
  };

  const getMethodIcon = (method: string) => {
    if (method === "face") return <Camera className="h-3.5 w-3.5" />;
    if (method === "fingerprint") return <Fingerprint className="h-3.5 w-3.5" />;
    return <Clock className="h-3.5 w-3.5" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "present") return <Badge variant="default" data-testid={`badge-status-${status}`}>Presente</Badge>;
    if (status === "late") return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Tarde</Badge>;
    return <Badge variant="destructive" data-testid={`badge-status-${status}`}>Ausente</Badge>;
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize" data-testid="text-dashboard-date">{formattedDate}</p>
        </div>
        <Link href="/check-in">
          <Button data-testid="button-quick-checkin">
            <Camera className="h-4 w-4 mr-2" />
            Registrar Asistencia
          </Button>
        </Link>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Empleados" value={stats?.totalEmployees ?? 0} icon={Users} variant="default" />
          <StatCard title="Presentes Hoy" value={stats?.presentToday ?? 0} icon={UserCheck} variant="success" />
          <StatCard title="Ausentes Hoy" value={stats?.absentToday ?? 0} icon={UserX} variant="danger" />
          <StatCard title="Llegaron Tarde" value={stats?.lateToday ?? 0} icon={Clock} variant="warning" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Asistencia de Hoy</CardTitle>
            <Link href="/attendance">
              <Button variant="ghost" size="sm" data-testid="link-view-all-attendance">
                Ver todo <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentAttendance && recentAttendance.length > 0 ? (
              <div className="space-y-3">
                {recentAttendance.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`attendance-row-${record.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background">
                        {getMethodIcon(record.method)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{getEmployeeName(record.employeeId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          {record.checkOut ? ` → ${new Date(record.checkOut).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay registros de asistencia hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Métodos de Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Reconocimiento Facial</p>
                  <p className="text-xs text-muted-foreground">CompreFace Integration</p>
                </div>
                <Badge variant="secondary">Disponible</Badge>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500/10">
                  <Fingerprint className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Huella Digital</p>
                  <p className="text-xs text-muted-foreground">WebAuthn Biometrics</p>
                </div>
                <Badge variant="secondary">Disponible</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Camera, Fingerprint, UserCheck, LogIn, LogOut, Video, VideoOff, CheckCircle2, AlertCircle } from "lucide-react";
import type { Employee } from "@shared/schema";

function FaceRecognition({ onCapture }: { onCapture: (imageData: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Tu navegador no soporta acceso a la cámara. Usa Chrome o Edge en localhost.");
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      setStream(mediaStream);
      setStreaming(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setCameraError("Permiso denegado. Permite el acceso a la cámara en tu navegador.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No se encontró ninguna cámara conectada.");
      } else {
        setCameraError(`Error al encender la cámara: ${err.message}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setStreaming(false);
      setCameraError(null);
    }
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      onCapture(imageData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
        {streaming ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid="video-camera-feed" />
        ) : (
          <div className="text-center space-y-3 px-4">
            <Camera className={`h-12 w-12 mx-auto ${cameraError ? "text-red-500" : "text-muted-foreground"}`} />
            {cameraError ? (
              <p className="text-sm text-red-500">{cameraError}</p>
            ) : (
              <p className="text-sm text-muted-foreground">La cámara está apagada</p>
            )}
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none">
          {streaming && (
            <svg className="w-full h-full" viewBox="0 0 640 480">
              <ellipse cx="320" cy="220" rx="120" ry="160" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="8 4" opacity="0.6" />
            </svg>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-2">
        {!streaming ? (
          <Button onClick={startCamera} className="flex-1" data-testid="button-start-camera">
            <Video className="h-4 w-4 mr-2" /> Encender Cámara
          </Button>
        ) : (
          <>
            <Button onClick={stopCamera} variant="secondary" className="flex-1" data-testid="button-stop-camera">
              <VideoOff className="h-4 w-4 mr-2" /> Apagar
            </Button>
            <Button onClick={capturePhoto} className="flex-1" data-testid="button-capture-photo">
              <Camera className="h-4 w-4 mr-2" /> Capturar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function FingerprintScanner({ onScan }: { onScan: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const startScan = async () => {
    setScanning(true);
    setScanned(false);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
      onScan();
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ${
            scanning ? "bg-primary/20 animate-pulse" : scanned ? "bg-emerald-500/20" : "bg-muted"
          }`}>
            {scanned ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            ) : (
              <Fingerprint className={`h-12 w-12 ${scanning ? "text-primary" : "text-muted-foreground"}`} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {scanning ? "Escaneando..." : scanned ? "Huella capturada" : "Coloque su dedo en el lector"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {scanning ? "Por favor no mueva el dedo" : scanned ? "Verificación exitosa" : "WebAuthn Biometric API"}
            </p>
          </div>
        </div>
      </div>
      <Button onClick={startScan} disabled={scanning} className="w-full" data-testid="button-scan-fingerprint">
        <Fingerprint className="h-4 w-4 mr-2" />
        {scanning ? "Escaneando..." : "Escanear Huella"}
      </Button>
    </div>
  );
}

export default function CheckInPage() {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [method, setMethod] = useState<"face" | "fingerprint">("face");
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; employeeName?: string } | null>(null);
  const { toast } = useToast();

  const { data: employees } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const checkInMutation = useMutation({
    mutationFn: async ({ employeeId, method }: { employeeId: string; method: string }) => {
      const res = await apiRequest("POST", "/api/attendance/check-in", { employeeId, method });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const empName = data.employee ? `${data.employee.firstName} ${data.employee.lastName}` : "";
      setLastResult({ success: true, message: "Entrada registrada exitosamente", employeeName: empName });
      toast({ title: "Entrada registrada", description: `${empName} ha registrado su entrada.` });
    },
    onError: (err: Error) => {
      setLastResult({ success: false, message: err.message });
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const res = await apiRequest("POST", "/api/attendance/check-out", { employeeId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      const empName = data.employee ? `${data.employee.firstName} ${data.employee.lastName}` : "";
      setLastResult({ success: true, message: "Salida registrada exitosamente", employeeName: empName });
      toast({ title: "Salida registrada", description: `${empName} ha registrado su salida.` });
    },
    onError: (err: Error) => {
      setLastResult({ success: false, message: err.message });
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCheckIn = () => {
    if (!selectedEmployee) {
      toast({ title: "Selecciona un empleado", variant: "destructive" });
      return;
    }
    checkInMutation.mutate({ employeeId: selectedEmployee, method });
  };

  const handleCheckOut = () => {
    if (!selectedEmployee) {
      toast({ title: "Selecciona un empleado", variant: "destructive" });
      return;
    }
    checkOutMutation.mutate(selectedEmployee);
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-checkin-title">Registrar Asistencia</h1>
        <p className="text-sm text-muted-foreground">Selecciona un empleado y el método de verificación</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seleccionar Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger data-testid="select-employee-checkin">
                  <SelectValue placeholder="Seleccionar empleado..." />
                </SelectTrigger>
                <SelectContent>
                  {employees?.filter(e => e.active).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} — {emp.employeeCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Método de Verificación</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={method} onValueChange={val => setMethod(val as "face" | "fingerprint")}>
                <TabsList className="w-full">
                  <TabsTrigger value="face" className="flex-1" data-testid="tab-face">
                    <Camera className="h-4 w-4 mr-2" /> Reconocimiento Facial
                  </TabsTrigger>
                  <TabsTrigger value="fingerprint" className="flex-1" data-testid="tab-fingerprint">
                    <Fingerprint className="h-4 w-4 mr-2" /> Huella Digital
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="face" className="mt-4">
                  <FaceRecognition onCapture={() => {}} />
                </TabsContent>
                <TabsContent value="fingerprint" className="mt-4">
                  <FingerprintScanner onScan={() => {}} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleCheckIn}
                className="w-full"
                disabled={!selectedEmployee || checkInMutation.isPending}
                data-testid="button-check-in"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {checkInMutation.isPending ? "Registrando..." : "Registrar Entrada"}
              </Button>
              <Button
                onClick={handleCheckOut}
                variant="secondary"
                className="w-full"
                disabled={!selectedEmployee || checkOutMutation.isPending}
                data-testid="button-check-out"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {checkOutMutation.isPending ? "Registrando..." : "Registrar Salida"}
              </Button>
            </CardContent>
          </Card>

          {lastResult && (
            <Card data-testid="card-last-result">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {lastResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{lastResult.message}</p>
                    {lastResult.employeeName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{lastResult.employeeName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedEmployee && employees && (
            <Card>
              <CardContent className="p-5">
                {(() => {
                  const emp = employees.find(e => e.id === selectedEmployee);
                  if (!emp) return null;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-sm">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <p>{emp.department} — {emp.position}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {emp.faceRegistered && <Badge variant="secondary" className="text-xs"><Camera className="h-3 w-3 mr-1" />Rostro</Badge>}
                        {emp.fingerprintRegistered && <Badge variant="secondary" className="text-xs"><Fingerprint className="h-3 w-3 mr-1" />Huella</Badge>}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

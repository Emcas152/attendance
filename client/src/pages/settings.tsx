import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Server, Key, CheckCircle2, XCircle, Loader2, Clock, Shield } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [compreFaceUrl, setCompreFaceUrl] = useState("");
  const [compreFaceApiKey, setCompreFaceApiKey] = useState("");
  const [lateThreshold, setLateThreshold] = useState("09:00");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "connected" | "failed">("idle");

  const { data: settingsData } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settingsData) {
      if (settingsData.compreface_url) setCompreFaceUrl(settingsData.compreface_url);
      if (settingsData.compreface_api_key) setCompreFaceApiKey(settingsData.compreface_api_key);
      if (settingsData.late_threshold) setLateThreshold(settingsData.late_threshold);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest("POST", "/api/settings", { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const testConnection = async () => {
    if (!compreFaceUrl || !compreFaceApiKey) {
      toast({ title: "Campos requeridos", description: "Ingresa la URL y API Key", variant: "destructive" });
      return;
    }
    setConnectionStatus("testing");
    try {
      const res = await apiRequest("POST", "/api/compreface/test", { url: compreFaceUrl, apiKey: compreFaceApiKey });
      const data = await res.json();
      if (data.connected) {
        setConnectionStatus("connected");
        toast({ title: "Conexión exitosa", description: "CompreFace está disponible" });
      } else {
        setConnectionStatus("failed");
        toast({ title: "Error de conexión", description: data.message || "No se pudo conectar", variant: "destructive" });
      }
    } catch {
      setConnectionStatus("failed");
      toast({ title: "Error", description: "No se pudo conectar con CompreFace", variant: "destructive" });
    }
  };

  const saveCompreFace = async () => {
    await saveMutation.mutateAsync({ key: "compreface_url", value: compreFaceUrl });
    await saveMutation.mutateAsync({ key: "compreface_api_key", value: compreFaceApiKey });
    toast({ title: "Configuración guardada", description: "Los datos de CompreFace se actualizaron" });
  };

  const saveGeneral = async () => {
    await saveMutation.mutateAsync({ key: "late_threshold", value: lateThreshold });
    toast({ title: "Configuración guardada", description: "La hora límite se actualizó" });
  };

  const getStatusIcon = () => {
    if (connectionStatus === "testing") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (connectionStatus === "connected") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (connectionStatus === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
    return null;
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">Configuración</h1>
        <p className="text-sm text-muted-foreground">Administra la conexión con CompreFace y ajustes generales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" /> CompreFace
                </CardTitle>
                <CardDescription className="mt-1">Conexión con el servidor de reconocimiento facial</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {connectionStatus === "connected" && <Badge variant="default">Conectado</Badge>}
                {connectionStatus === "failed" && <Badge variant="destructive">Error</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cfUrl" className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" /> URL del Servidor
              </Label>
              <Input
                id="cfUrl"
                placeholder="http://localhost:8000"
                value={compreFaceUrl}
                onChange={e => setCompreFaceUrl(e.target.value)}
                data-testid="input-compreface-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfKey" className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" /> API Key
              </Label>
              <Input
                id="cfKey"
                type="password"
                placeholder="Tu API key de CompreFace"
                value={compreFaceApiKey}
                onChange={e => setCompreFaceApiKey(e.target.value)}
                data-testid="input-compreface-key"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={testConnection} disabled={connectionStatus === "testing"} data-testid="button-test-connection">
                {connectionStatus === "testing" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Probando...</>
                ) : (
                  "Probar Conexión"
                )}
              </Button>
              <Button onClick={saveCompreFace} disabled={saveMutation.isPending} data-testid="button-save-compreface">
                {saveMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
            <div className="mt-4 p-3 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground leading-relaxed">
                CompreFace es un servicio de reconocimiento facial de código abierto. 
                Necesitas tener un servidor CompreFace en ejecución con un servicio de reconocimiento creado.
                La API Key se obtiene al crear un servicio en la interfaz de administración de CompreFace.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Horario
              </CardTitle>
              <CardDescription>Configura la hora límite de llegada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Hora límite para marcar "tarde"</Label>
                <Input
                  id="threshold"
                  type="time"
                  value={lateThreshold}
                  onChange={e => setLateThreshold(e.target.value)}
                  data-testid="input-late-threshold"
                />
                <p className="text-xs text-muted-foreground">Los empleados que registren entrada después de esta hora serán marcados como "tarde"</p>
              </div>
              <Button onClick={saveGeneral} disabled={saveMutation.isPending} data-testid="button-save-general">
                {saveMutation.isPending ? "Guardando..." : "Guardar Horario"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Métodos Biométricos
              </CardTitle>
              <CardDescription>Estado de los métodos de verificación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Reconocimiento Facial</p>
                  <p className="text-xs text-muted-foreground">Requiere CompreFace configurado</p>
                </div>
                <Switch checked={!!compreFaceUrl && !!compreFaceApiKey} disabled data-testid="switch-face-status" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Huella Digital</p>
                  <p className="text-xs text-muted-foreground">WebAuthn API del navegador</p>
                </div>
                <Switch checked={true} disabled data-testid="switch-fingerprint-status" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

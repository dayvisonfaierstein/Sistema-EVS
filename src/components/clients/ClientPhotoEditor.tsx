import { useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { ImageIcon, LoaderCircle, Minus, Plus, Trash2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { createCroppedProfilePhoto } from "@/lib/image-processing";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ClientPhotoEditor({
  value,
  onChange,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
}) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(() => {
    if (!sourceFile) {
      setSourceUrl("");
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast.error("Use uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("A imagem original deve ter no máximo 10 MB.");
      return;
    }
    setSourceFile(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setOpen(true);
  }

  function cancel() {
    if (processing) return;
    setOpen(false);
    setSourceFile(null);
  }

  async function save() {
    if (!sourceFile || !croppedArea) return;
    setProcessing(true);
    try {
      const optimized = await createCroppedProfilePhoto(sourceFile, croppedArea);
      onChange(optimized);
      setOpen(false);
      setSourceFile(null);
      toast.success("Foto recortada e otimizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível processar a foto.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-24 border-2 border-primary/15 shadow-sm">
          <AvatarImage src={previewUrl} alt="Prévia da foto do cliente" />
          <AvatarFallback className="bg-primary/5">
            <ImageIcon className="size-8 text-primary/45" />
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload />
                {value ? "Trocar foto" : "Selecionar foto"}
                <input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    selectPhoto(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                <Trash2 />
                Remover
              </Button>
            )}
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            JPG, PNG ou WebP de até 10 MB. A foto será recortada e salva em 600 × 600 px.
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => !next && cancel()}>
        <DialogContent className="max-h-[96vh] max-w-2xl overflow-y-auto data-[state=closed]:!animate-none data-[state=open]:!animate-none sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar foto do cliente</DialogTitle>
            <DialogDescription>
              Arraste para reposicionar e use o controle de zoom. A área quadrada mostra o resultado
              final.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[min(58vh,520px)] min-h-72 overflow-hidden rounded-xl bg-slate-950">
            {sourceUrl && (
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                objectFit="contain"
                minZoom={1}
                maxZoom={4}
                zoomWithScroll
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedArea(pixels)}
                style={{
                  cropAreaStyle: {
                    border: "2px solid white",
                    boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.66)",
                  },
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <Minus className="size-4 text-muted-foreground" />
            <Slider
              aria-label="Zoom da foto"
              value={[zoom]}
              min={1}
              max={4}
              step={0.01}
              onValueChange={([value]) => setZoom(value)}
            />
            <Plus className="size-4 text-muted-foreground" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            No celular, arraste com um dedo e use o gesto de pinça para ampliar ou reduzir.
          </p>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={cancel} disabled={processing}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={!croppedArea || processing}>
              {processing ? <LoaderCircle className="animate-spin" /> : <Upload />}
              {processing ? "Processando..." : "Salvar foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.72,
  maxInputMB = 10,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxInputMB * 1024 * 1024) {
      reject(new Error(`Imagem muito grande. Máximo ${maxInputMB}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao processar imagem.'));
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

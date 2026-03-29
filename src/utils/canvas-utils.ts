import * as fabric from 'fabric';

export interface SafeArea {
  left: number;
  top: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
}

export const initializeCanvas = (
  canvasElement: HTMLCanvasElement,
  width: number = 360,
  height: number = 720
): any => {
  const canvas = new fabric.Canvas(canvasElement, {
    width,
    height,
    backgroundColor: 'transparent',
    preserveObjectStacking: true,
    allowTouchScrolling: true,
    stopContextMenu: true,
  });

  return canvas;
};

export const loadCaseImage = (
  canvas: any,
  imageUrl: string,
  borderRadius?: number,
  onLoaded?: (safeArea: SafeArea) => void,
  targetWidth?: number
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Removed crossOrigin

    img.onload = () => {
      const fabricImg = new fabric.Image(img, {
        selectable: false,
        evented: false,
      });

      let scale: number;
      const effectiveWidth = targetWidth || canvas.width;

      if (img.width > img.height) {
        fabricImg.scaleToWidth(effectiveWidth);
        scale = effectiveWidth / img.width;
      } else {
        scale = Math.min(effectiveWidth / img.width, canvas.height / img.height);
        fabricImg.scale(scale);
      }

      canvas.centerObject(fabricImg);

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const radius = borderRadius !== undefined ? borderRadius : scaledWidth * 0.08;

      const safeArea: SafeArea = {
        left: fabricImg.left || 0,
        top: fabricImg.top || 0,
        width: scaledWidth,
        height: scaledHeight,
        rx: radius,
        ry: radius,
      };

      canvas.add(fabricImg);
      (fabricImg as any).set('id', 'phone-overlay');
      
      reorderLayers(canvas);
      canvas.renderAll();

      if (onLoaded) onLoaded(safeArea);
      resolve({ image: fabricImg, safeArea });
    };

    img.onerror = () => {
      console.error('Failed to load phone image:', imageUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
};

export const reorderLayers = (canvas: any): void => {
  const objects = canvas.getObjects();
  const phoneCase = objects.find((obj: any) => obj.id === 'phone-overlay');
  const design = objects.find((obj: any) => obj.id === 'test-design');

  if (design && phoneCase) {
    canvas.sendObjectToBack(design);
    canvas.bringObjectToFront(phoneCase);
  }

  canvas.renderAll();
};

export const addTestDesign = (
  canvas: any,
  imageUrl: string,
  safeArea: SafeArea
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Removed crossOrigin

    img.onload = () => {
      const natW = img.naturalWidth || img.width;
      const natH = img.naturalHeight || img.height;

      const scaleX = safeArea.width / natW;
      const scaleY = safeArea.height / natH;

      const fabricImg = new fabric.Image(img, {
        originX: 'center',
        originY: 'center',
        scaleX: scaleX,
        scaleY: scaleY,
        selectable: false,
        evented: false,
      });
      (fabricImg as any).set('id', 'test-design');

      fabricImg.clipPath = new fabric.Rect({
        left: safeArea.left,
        top: safeArea.top,
        width: safeArea.width,
        height: safeArea.height,
        rx: safeArea.rx,
        ry: safeArea.ry,
        absolutePositioned: true,
      });

      canvas.add(fabricImg);
      canvas.centerObject(fabricImg);
      reorderLayers(canvas);
      canvas.renderAll();

      resolve(fabricImg);
    };

    img.onerror = (e) => {
      console.error('Failed to load test design image:', imageUrl, e);
      reject(new Error('Failed to load test design'));
    };

    img.src = imageUrl;
  });
};

export const updateClipRadius = (canvas: any, radius: number) => {
    const design = canvas.getObjects().find((obj: any) => (obj as any).id === 'test-design');
    if (design && design.clipPath) {
        design.clipPath.set({ rx: radius, ry: radius });
        canvas.renderAll();
    }
};

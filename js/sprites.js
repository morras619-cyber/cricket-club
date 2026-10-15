// Hand-drawn sprite animations. Frames come from assets/*.webp atlases; ax/ay is the anchor
// (torso centre, ground line) inside each frame. Heroes without a sprite use the vector figure.
const SHEETS = {
  raja: { src: 'assets/raja-batter.webp', idleHeight: 182, frames: {"idle":[{"x":0,"y":0,"w":118,"h":181,"ax":60.0,"ay":181.0},{"x":120,"y":0,"w":112,"h":182,"ax":55.0,"ay":182.0},{"x":234,"y":0,"w":110,"h":182,"ax":54.0,"ay":182.0},{"x":346,"y":0,"w":107,"h":182,"ax":52.0,"ay":182.0},{"x":455,"y":0,"w":113,"h":181,"ax":57.0,"ay":182.0},{"x":570,"y":0,"w":112,"h":182,"ax":52.0,"ay":182.0}],"straight":[{"x":684,"y":0,"w":137,"h":161,"ax":54.0,"ay":163.0},{"x":823,"y":0,"w":138,"h":210,"ax":72.0,"ay":211.0},{"x":963,"y":0,"w":126,"h":157,"ax":61.0,"ay":157.0},{"x":1091,"y":0,"w":129,"h":207,"ax":61.0,"ay":209.0},{"x":1222,"y":0,"w":123,"h":158,"ax":62.0,"ay":161.0},{"x":1347,"y":0,"w":131,"h":157,"ax":81.0,"ay":158.0},{"x":1480,"y":0,"w":101,"h":160,"ax":53.0,"ay":164.0},{"x":0,"y":212,"w":83,"h":214,"ax":47.0,"ay":217.0}],"left":[{"x":85,"y":212,"w":97,"h":167,"ax":44.0,"ay":169.0},{"x":184,"y":212,"w":109,"h":161,"ax":51.0,"ay":161.0},{"x":295,"y":212,"w":102,"h":168,"ax":47.0,"ay":171.0},{"x":399,"y":212,"w":104,"h":166,"ax":56.0,"ay":166.0},{"x":505,"y":212,"w":119,"h":154,"ax":69.0,"ay":154.0},{"x":626,"y":212,"w":107,"h":166,"ax":56.0,"ay":168.0},{"x":735,"y":212,"w":91,"h":158,"ax":55.0,"ay":158.0},{"x":828,"y":212,"w":107,"h":204,"ax":45.0,"ay":206.0}],"right":[{"x":937,"y":212,"w":106,"h":169,"ax":56.0,"ay":171.0},{"x":1045,"y":212,"w":91,"h":164,"ax":38.0,"ay":165.0},{"x":1138,"y":212,"w":117,"h":181,"ax":49.0,"ay":182.0},{"x":1257,"y":212,"w":135,"h":159,"ax":73.0,"ay":159.0},{"x":1394,"y":212,"w":131,"h":168,"ax":65.0,"ay":168.0},{"x":0,"y":428,"w":96,"h":168,"ax":54.0,"ay":170.0},{"x":98,"y":428,"w":100,"h":168,"ax":50.0,"ay":169.0},{"x":200,"y":428,"w":93,"h":180,"ax":46.0,"ay":182.0}],"run":[{"x":295,"y":428,"w":106,"h":182,"ax":53.0,"ay":184.0},{"x":403,"y":428,"w":99,"h":181,"ax":51.0,"ay":184.0},{"x":504,"y":428,"w":122,"h":183,"ax":63.0,"ay":186.0},{"x":628,"y":428,"w":119,"h":184,"ax":54.0,"ay":184.0},{"x":749,"y":428,"w":141,"h":185,"ax":64.0,"ay":186.0},{"x":892,"y":428,"w":154,"h":183,"ax":70.0,"ay":185.0}],"celebrate":[{"x":1048,"y":428,"w":104,"h":194,"ax":50.0,"ay":195.0},{"x":1154,"y":428,"w":108,"h":171,"ax":60.0,"ay":172.0},{"x":1264,"y":428,"w":104,"h":173,"ax":50.0,"ay":175.0},{"x":1370,"y":428,"w":141,"h":160,"ax":65.0,"ay":160.0},{"x":0,"y":624,"w":135,"h":197,"ax":60.0,"ay":197.0},{"x":137,"y":624,"w":164,"h":200,"ax":64.0,"ay":200.0}]} },
};

const loaded = {};
export function sprite(id) {
  const s = SHEETS[id];
  if (!s) return null;
  if (!loaded[id]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = s.src;
    loaded[id] = img;
  }
  const img = loaded[id];
  return img.complete && img.naturalWidth ? { ...s, img } : null;
}

// Draws frame i of an animation with its feet at (x, y). height = on-screen height of the standing pose.
export function drawSprite(ctx, sp, anim, i, x, y, height, flip = false) {
  const list = sp.frames[anim];
  const f = list[Math.max(0, Math.min(list.length - 1, i))];
  const k = height / sp.idleHeight;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sp.img, f.x, f.y, f.w, f.h, -f.ax * k, -f.ay * k, f.w * k, f.h * k);
  ctx.restore();
}

export const frameCount = (sp, anim) => sp.frames[anim].length;

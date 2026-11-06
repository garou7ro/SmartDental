/**
 * Imprime solo un fragmento de la página: lo copia a un contenedor en la raíz del documento y
 * oculta todo lo demás mientras dura la impresión. Evita que la maquetación del panel (barras
 * laterales, posiciones fijas, fondos) se cuele en el papel o en el PDF.
 */
export default function printNode(node, mode = 'doc') {
  if (!node) return;
  const root = document.createElement('div');
  root.id = 'sd-print-root';
  root.dataset.mode = mode;
  const copy = node.cloneNode(true);
  // cloneNode no copia lo escrito en campos controlados: se pasa a texto estático.
  const sources = node.querySelectorAll('textarea, input');
  copy.querySelectorAll('textarea, input').forEach((el, i) => {
    const value = sources[i]?.value ?? '';
    if (el.tagName === 'TEXTAREA') el.textContent = value; else el.setAttribute('value', value);
  });
  root.appendChild(copy);
  document.body.appendChild(root);
  document.body.classList.add('sd-printing');
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove('sd-printing');
    root.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Algunos navegadores no emiten afterprint; print() es bloqueante en la mayoría.
  setTimeout(cleanup, 1000);
}

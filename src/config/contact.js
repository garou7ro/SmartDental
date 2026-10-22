// Canales comerciales de SmartDental.
// Se pueden sobrescribir desde .env (VITE_WHATSAPP_NUMBER, VITE_WHATSAPP_MESSAGE, VITE_CONTACT_EMAIL).
// Los valores por defecto son los confirmados por el equipo el 2026-10-18.

const env = import.meta.env;

export const WHATSAPP_NUMBER = (env.VITE_WHATSAPP_NUMBER || '51954519916').replace(/\D/g, '');

export const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL || 'smartdental@smartdental.com';

const DEFAULT_WHATSAPP_MESSAGE =
  env.VITE_WHATSAPP_MESSAGE ||
  'Hola, quisiera conocer más sobre SmartDental y las opciones disponibles para mi consultorio odontológico.';

export function whatsappLink(message = DEFAULT_WHATSAPP_MESSAGE) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink({
  subject = 'Información sobre SmartDental',
  body = 'Hola, quisiera recibir información sobre SmartDental para mi consultorio odontológico.\n\nNombre:\nConsultorio / ciudad:\nNúmero de profesionales:\n',
} = {}) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Número legible para mostrar en pantalla, p. ej. "+51 954 519 916".
export const WHATSAPP_DISPLAY = WHATSAPP_NUMBER.startsWith('51') && WHATSAPP_NUMBER.length === 11
  ? `+51 ${WHATSAPP_NUMBER.slice(2, 5)} ${WHATSAPP_NUMBER.slice(5, 8)} ${WHATSAPP_NUMBER.slice(8)}`
  : `+${WHATSAPP_NUMBER}`;

import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage from '../components/legal/LegalPage';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY } from '../config/contact';

// Contenido alineado con el funcionamiento real del producto (activación coordinada,
// planes Básico y Pro, permisos por rol y asistente IA con aprobación).
const SECTIONS = [
  {
    id: 'servicio',
    title: 'Qué es SmartDental',
    body: (
      <>
        <p>SmartDental es un sistema web para gestionar consultorios odontológicos. Incluye agenda de citas, fichas de pacientes con odontograma, inventario de insumos, registro de caja y usuarios con permisos para el equipo del consultorio.</p>
        <p>El plan Pro añade un asistente con inteligencia artificial dentro del panel, descrito en el punto 7.</p>
      </>
    ),
  },
  {
    id: 'activacion',
    title: 'Contratación y activación',
    body: (
      <>
        <p>SmartDental no se contrata ni se paga desde esta web. Las cuentas se activan después de coordinar con nuestro equipo por WhatsApp o correo electrónico.</p>
        <p>Al activar la cuenta, el titular del consultorio recibe su acceso y puede crear usuarios para su equipo dentro del límite de su plan.</p>
      </>
    ),
  },
  {
    id: 'planes',
    title: 'Planes y precios',
    body: (
      <>
        <ul>
          <li><strong>Plan Básico:</strong> S/ 70 al mes, hasta 3 usuarios del equipo e incluye el copiloto con IA en el panel.</li>
          <li><strong>Plan Pro:</strong> S/ 100 al mes, hasta 8 usuarios del equipo e incluye la IA con interacción directa a pacientes (agendamiento y recordatorios personalizados por WhatsApp).</li>
        </ul>
        <p>Las condiciones vigentes, la forma de pago y la fecha de inicio se confirman al coordinar la activación. Los cambios de plan se solicitan a nuestro equipo.</p>
      </>
    ),
  },
  {
    id: 'cuentas',
    title: 'Cuentas y responsabilidades',
    body: (
      <>
        <p>Cada persona ingresa con su propio usuario y contraseña, que no deben compartirse. El titular decide qué rol tiene cada miembro del equipo y qué pacientes o citas se le asignan.</p>
        <p>El consultorio es responsable de la exactitud de la información que registra y de mantener al día los accesos de su personal, por ejemplo, pidiendo que se desactive el usuario de quien deja de trabajar en él.</p>
      </>
    ),
  },
  {
    id: 'uso',
    title: 'Uso adecuado',
    body: (
      <>
        <p>SmartDental debe usarse con fines lícitos y profesionales. No está permitido:</p>
        <ul>
          <li>Intentar acceder a información de otros consultorios o de usuarios sin autorización.</li>
          <li>Vulnerar o probar la seguridad del sistema sin nuestro permiso.</li>
          <li>Cargar archivos o contenido malicioso.</li>
          <li>Usar la plataforma para fines distintos de la gestión del consultorio.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'datos-clinicos',
    title: 'Información clínica',
    body: (
      <>
        <p>El consultorio es responsable de los datos de sus pacientes y de contar con su consentimiento para registrarlos. SmartDental trata esa información por encargo del consultorio y únicamente para prestar el servicio, como se explica en la <Link to="/privacy">Política de privacidad</Link>.</p>
        <p>SmartDental es una herramienta de registro y organización. No realiza diagnósticos: el odontograma y las fichas reflejan lo que registra el profesional, y las decisiones clínicas son siempre suyas.</p>
      </>
    ),
  },
  {
    id: 'asistente',
    title: 'Asistente con IA (plan Pro)',
    body: (
      <>
        <p>El asistente interpreta instrucciones escritas para proponer cambios en la agenda. Los cambios solo se aplican si un usuario los revisa y los aprueba.</p>
        <p>Como cualquier sistema de inteligencia artificial, puede equivocarse. Revisa cada propuesta antes de aprobarla.</p>
      </>
    ),
  },
  {
    id: 'disponibilidad',
    title: 'Disponibilidad del servicio',
    body: (
      <p>Trabajamos para que SmartDental esté disponible de forma continua, pero pueden producirse interrupciones por mantenimiento, actualizaciones o incidencias de los proveedores que alojan el servicio. Cuando sea posible, avisaremos con antelación de los mantenimientos programados.</p>
    ),
  },
  {
    id: 'baja',
    title: 'Suspensión y baja',
    body: (
      <>
        <p>Podemos suspender una cuenta si se incumplen estos términos o las condiciones acordadas al activarla.</p>
        <p>El consultorio puede solicitar la baja en cualquier momento escribiéndonos. Antes de cerrarla, coordinaremos contigo la entrega de una copia de tu información.</p>
      </>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios en estos términos',
    body: (
      <p>Si modificamos estos términos de forma relevante, lo comunicaremos con antelación por los canales de contacto de la cuenta o dentro del panel. La fecha de la última actualización figura al inicio de esta página.</p>
    ),
  },
  {
    id: 'contacto',
    title: 'Contacto',
    body: (
      <p>Para cualquier consulta sobre estos términos, escríbenos por WhatsApp al {WHATSAPP_DISPLAY} o a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      kind="terms"
      title="Términos y condiciones"
      updated="18 de octubre de 2026"
      intro="Estas condiciones explican cómo funciona el servicio de SmartDental, qué puedes esperar de nosotros y qué esperamos de quienes lo usan."
      sections={SECTIONS}
    />
  );
}

import React from 'react';
import LegalPage from '../components/legal/LegalPage';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY } from '../config/contact';

// Datos y proveedores según lo que el sistema realmente guarda y usa
// (tablas de Supabase, Edge Functions y asistente con Google Gemini en el plan Pro).
const SECTIONS = [
  {
    id: 'responsables',
    title: 'Quién es responsable de los datos',
    body: (
      <>
        <p><strong>Datos de pacientes:</strong> el consultorio es el responsable de la información de sus pacientes. SmartDental la trata por encargo del consultorio y solo para prestar el servicio.</p>
        <p><strong>Datos de cuentas y contacto:</strong> SmartDental es responsable de los datos de los usuarios del panel y de la información que nos envías al escribirnos.</p>
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Qué datos tratamos',
    body: (
      <ul>
        <li><strong>Usuarios del panel:</strong> nombre, correo electrónico, rol y estado de la cuenta, además de un registro de actividad con el correo del usuario y la acción realizada.</li>
        <li><strong>Consultorio:</strong> nombre, dirección, teléfono, correo de contacto, logotipo y plan contratado.</li>
        <li><strong>Pacientes:</strong> nombre, DNI, teléfono, correo electrónico, tratamiento, alergias y odontograma.</li>
        <li><strong>Agenda:</strong> fecha y hora de cada cita, motivo, notas, estado y profesional asignado.</li>
        <li><strong>Caja:</strong> concepto, monto, fecha y paciente vinculado a cada ingreso.</li>
        <li><strong>Inventario:</strong> insumos, cantidades y stock mínimo.</li>
        <li><strong>Contacto comercial:</strong> los datos que nos compartes por WhatsApp o correo electrónico.</li>
      </ul>
    ),
  },
  {
    id: 'finalidad',
    title: 'Para qué los usamos',
    body: (
      <>
        <ul>
          <li>Prestar el servicio: guardar y mostrar la información de tu consultorio.</li>
          <li>Gestionar los accesos y permisos de cada usuario.</li>
          <li>Dar soporte y comunicarnos contigo sobre tu cuenta.</li>
        </ul>
        <p><strong>No vendemos ni cedemos los datos de tu consultorio o de tus pacientes a terceros con fines comerciales o publicitarios.</strong></p>
      </>
    ),
  },
  {
    id: 'proveedores',
    title: 'Proveedores que intervienen',
    body: (
      <>
        <p>Para funcionar, SmartDental se apoya en estos proveedores, que tratan los datos únicamente para prestar su servicio:</p>
        <ul>
          <li><strong>Supabase:</strong> base de datos, autenticación de usuarios y funciones del servidor donde se aloja la información del panel.</li>
          <li><strong>Google (Gemini):</strong> en el plan Pro y tras activación expresa de la clínica, procesa el texto de mensajes entrantes de WhatsApp para redactar respuestas breves. SmartDental no adjunta el teléfono ni el nombre de contacto; el texto podría incluir datos que la persona escriba, por lo que se recomienda no enviar información clínica o identificable por este canal.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'seguridad',
    title: 'Cómo protegemos la información',
    body: (
      <ul>
        <li>Cada persona ingresa con su propio usuario y contraseña.</li>
        <li>Las reglas de la base de datos separan la información de cada consultorio, de modo que solo sus usuarios pueden acceder a ella.</li>
        <li>Los permisos por rol limitan lo que ve cada usuario; por ejemplo, la caja queda reservada para el titular.</li>
        <li>La comunicación entre el panel y la base de datos viaja cifrada.</li>
      </ul>
    ),
  },
  {
    id: 'conservacion',
    title: 'Cuánto tiempo los conservamos',
    body: (
      <p>Conservamos la información mientras la cuenta del consultorio esté activa. Si solicitas la baja, coordinaremos contigo la entrega de una copia y después la eliminaremos, salvo que una obligación legal exija conservar parte de ella.</p>
    ),
  },
  {
    id: 'derechos',
    title: 'Tus derechos',
    body: (
      <>
        <p>Puedes solicitar el acceso, la rectificación, la cancelación o la oposición al tratamiento de tus datos, conforme a la Ley N.º 29733 de Protección de Datos Personales del Perú, escribiendo a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        <p>Si eres paciente de un consultorio que usa SmartDental, dirige tu solicitud a ese consultorio, que es el responsable de tus datos. Le ayudaremos a atenderla.</p>
      </>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios en esta política',
    body: (
      <p>Si cambiamos esta política de forma relevante, lo comunicaremos con antelación por los canales de contacto de la cuenta o dentro del panel. La fecha de la última actualización figura al inicio de esta página.</p>
    ),
  },
  {
    id: 'contacto',
    title: 'Contacto',
    body: (
      <p>Para cualquier consulta sobre privacidad, escríbenos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> o por WhatsApp al {WHATSAPP_DISPLAY}.</p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      kind="privacy"
      title="Política de privacidad"
      updated="18 de octubre de 2026"
      intro="Qué información guarda SmartDental, para qué la usa, quién interviene en su tratamiento y cómo puedes ejercer tus derechos."
      sections={SECTIONS}
    />
  );
}

import { LegalPage } from '@/components/legal-page';
import { defineCopy, useCopy } from '@/providers/i18n-context';

const termsCopy = defineCopy({
  es: { title: 'Términos y Condiciones', description: 'Reglas aplicables al acceso y uso de los servicios de CasaSeg.', summary: 'Este documento explica cómo utilizar CasaSeg, qué responsabilidades corresponden a cada rol y qué reglas protegen las operaciones de la plataforma.', contactTitle: '¿Necesitas aclarar una condición?', contactDescription: 'Cuéntanos qué apartado necesitas revisar e incluye la referencia de la operación si tu consulta está relacionada con una propiedad, contrato o pago.', contactLabel: 'Consultar los términos' },
  fr: { title: 'Conditions générales', description: 'Règles applicables à l’accès et à l’utilisation des services de CasaSeg.', summary: 'Ce document explique comment utiliser CasaSeg, quelles responsabilités incombent à chaque rôle et quelles règles protègent les opérations de la plateforme.', contactTitle: 'Besoin de précisions sur une condition ?', contactDescription: 'Indiquez-nous la section concernée et ajoutez la référence de l’opération si votre question porte sur un logement, un contrat ou un paiement.', contactLabel: 'Poser une question sur les conditions' },
  en: { title: 'Terms and Conditions', description: 'Rules that apply to accessing and using CasaSeg services.', summary: 'This document explains how to use CasaSeg, which responsibilities belong to each role and which rules protect the platform’s transactions.', contactTitle: 'Need a condition clarified?', contactDescription: 'Tell us which section you need to review and include the transaction reference if your question concerns a property, contract or payment.', contactLabel: 'Ask about the terms' },
});

const sections = [
  {
    title: 'Aceptación y alcance',
    body: 'Estos términos regulan el acceso y el uso de la aplicación, el sitio web y los servicios de CasaSeg. Al crear una cuenta o utilizar la plataforma, aceptas cumplir estas condiciones.',
    items: [
      'Debes leer estos términos antes de utilizar funciones autenticadas.',
      'Las condiciones específicas mostradas durante una operación también forman parte del acuerdo aplicable.',
      'Si no aceptas estas condiciones, no debes utilizar los servicios de CasaSeg.',
    ],
  },
  {
    title: 'Requisitos para utilizar CasaSeg',
    body: 'Debes tener capacidad legal suficiente para utilizar el servicio y formalizar las operaciones que solicites.',
    items: [
      'La información proporcionada durante el registro debe ser exacta y estar actualizada.',
      'No debes crear cuentas para suplantar a otra persona o entidad.',
      'Las personas que actúen en nombre de una organización deben tener autorización suficiente.',
    ],
  },
  {
    title: 'Cuenta y credenciales',
    body: 'Eres responsable de proteger tus credenciales y de las operaciones realizadas desde tu cuenta, salvo cuando exista un acceso no autorizado que nos hayas comunicado.',
    items: [
      'Debes utilizar un correo al que tengas acceso legítimo.',
      'No debes compartir contraseñas, códigos de verificación ni sesiones activas.',
      'Debes avisar a soporte si detectas una actividad que no reconoces.',
    ],
    note: 'CasaSeg nunca debe solicitarte por correo tu contraseña completa ni los códigos de verificación de tu cuenta.',
  },
  {
    title: 'Roles y responsabilidades',
    body: 'Las funciones disponibles dependen del rol validado para cada cuenta. Todos los usuarios pueden acceder a la navegación principal, pero cada rol mantiene responsabilidades diferentes.',
    items: [
      'Los clientes pueden explorar, guardar propiedades, conversar y gestionar sus solicitudes.',
      'Los propietarios pueden publicar y administrar únicamente las propiedades bajo su responsabilidad.',
      'Los administradores pueden supervisar la plataforma de acuerdo con sus permisos internos.',
      'No debes intentar acceder a funciones o datos asignados a otro rol.',
    ],
  },
  {
    title: 'Naturaleza del servicio',
    body: 'CasaSeg facilita herramientas para explorar, publicar y gestionar propiedades, comunicaciones y operaciones relacionadas. La disponibilidad y el alcance de cada función pueden variar.',
    items: [
      'La plataforma no garantiza que una propiedad permanezca disponible hasta la confirmación correspondiente.',
      'Las decisiones entre clientes y propietarios deben quedar reflejadas en los canales y documentos aplicables.',
      'Los servicios profesionales o administrativos externos deben regirse por sus propias condiciones.',
    ],
  },
  {
    title: 'Publicaciones de propiedades',
    body: 'Los propietarios son responsables de que sus publicaciones sean veraces, legales, suficientes y estén actualizadas.',
    items: [
      'Las fotografías y descripciones deben corresponder con la propiedad anunciada.',
      'El precio, la ubicación, las características y la disponibilidad deben mostrarse con claridad.',
      'No deben publicarse inmuebles sin autorización o documentación suficiente.',
      'CasaSeg puede solicitar verificaciones, corregir visibilidad o retirar contenido que incumpla estas condiciones.',
    ],
  },
  {
    title: 'Búsqueda, visitas y comunicaciones',
    body: 'Las herramientas de búsqueda, visitas y mensajería deben utilizarse únicamente para finalidades relacionadas con las propiedades y operaciones legítimas de CasaSeg.',
    items: [
      'Una solicitud de visita no constituye por sí sola una reserva o contrato.',
      'Las partes deben respetar las fechas, ubicaciones y condiciones confirmadas.',
      'No deben enviarse mensajes abusivos, engañosos, discriminatorios o no solicitados.',
      'Los cambios relevantes deberían mantenerse dentro de los canales disponibles para conservar trazabilidad.',
    ],
  },
  {
    title: 'Reservas y contratos',
    body: 'Una operación solo queda formalizada cuando se completan las confirmaciones y documentos exigidos para ese caso.',
    items: [
      'Cada parte debe revisar los datos, importes y condiciones antes de aceptar.',
      'Los contratos deben mostrar una versión identificable y el estado de las firmas.',
      'Las aceptaciones electrónicas deben realizarse desde la cuenta correspondiente.',
      'Las condiciones particulares prevalecen para los aspectos específicos de una operación.',
    ],
  },
  {
    title: 'Precios, pagos y comprobantes',
    body: 'Los importes y estados de pago deben confirmarse mediante el servidor y el proveedor de pago correspondiente.',
    items: [
      'El importe final debe mostrarse antes de confirmar una operación.',
      'No debes considerar un pago completado únicamente por una captura o mensaje de otro usuario.',
      'Las comisiones, impuestos o conceptos adicionales deben indicarse cuando resulten aplicables.',
      'Los comprobantes deben conservar la referencia necesaria para identificar la operación.',
    ],
    note: 'CasaSeg no debe solicitar datos completos de tarjeta mediante mensajes, correo electrónico o formularios no autorizados.',
  },
  {
    title: 'Cancelaciones, cambios y devoluciones',
    body: 'Las condiciones de cancelación, modificación o devolución dependen del tipo de operación y deben mostrarse antes de la confirmación cuando resulten aplicables.',
    items: [
      'Las solicitudes deben realizarse mediante el canal habilitado y dentro del plazo aplicable.',
      'La elegibilidad para una devolución debe verificarse con el estado real de la operación.',
      'Los importes no deben modificarse de forma retroactiva sin una causa válida y comunicada.',
    ],
  },
  {
    title: 'Conductas prohibidas',
    body: 'No puedes utilizar CasaSeg para actividades ilícitas, engañosas, inseguras o que perjudiquen a otros usuarios o a la plataforma.',
    items: [
      'Está prohibido manipular identidades, precios, valoraciones, estados o comprobantes.',
      'Está prohibido extraer datos de forma masiva o interferir con la seguridad del servicio.',
      'Está prohibido introducir código malicioso, automatizaciones abusivas o contenido fraudulento.',
      'Está prohibido acosar, discriminar o utilizar información de otros usuarios fuera de la finalidad autorizada.',
    ],
  },
  {
    title: 'Contenido y propiedad intelectual',
    body: 'Conservas los derechos que te correspondan sobre el contenido que aportas, pero autorizas su tratamiento y visualización en la medida necesaria para prestar el servicio.',
    items: [
      'Solo debes publicar contenido propio o para el que dispongas de autorización.',
      'Las marcas, interfaces, textos y elementos propios de CasaSeg no pueden reutilizarse sin permiso.',
      'Podemos retirar contenido ante una reclamación fundada o un incumplimiento verificable.',
    ],
  },
  {
    title: 'Privacidad y seguridad',
    body: 'El tratamiento de datos personales se describe en la Política de Privacidad. Debes respetar la confidencialidad de la información a la que accedas mediante CasaSeg.',
    items: [
      'No debes divulgar documentos, conversaciones o datos privados de otros usuarios.',
      'Los accesos temporales y recursos privados no deben compartirse fuera de la operación correspondiente.',
      'Los incidentes de seguridad deben comunicarse al centro de ayuda lo antes posible.',
    ],
  },
  {
    title: 'Servicios externos y disponibilidad',
    body: 'Algunas funciones pueden depender de proveedores externos, como autenticación, mapas, almacenamiento o pagos.',
    items: [
      'Los proveedores externos pueden aplicar condiciones y políticas propias.',
      'CasaSeg puede realizar mantenimientos o limitar temporalmente funciones por seguridad.',
      'No podemos garantizar un funcionamiento ininterrumpido cuando existan causas técnicas o externas fuera de nuestro control razonable.',
    ],
  },
  {
    title: 'Suspensión, cambios y contacto',
    body: 'Podemos restringir o suspender una cuenta cuando exista un incumplimiento, un riesgo de seguridad o una obligación válida. También podemos actualizar estas condiciones cuando cambien el servicio o los requisitos aplicables.',
    items: [
      'Las medidas deben ser proporcionales al riesgo o incumplimiento detectado.',
      'Los cambios relevantes deben comunicarse por un canal adecuado antes de producir efectos cuando resulte necesario.',
      'La legislación y los mecanismos de reclamación aplicables dependen de la relación contractual y del lugar correspondiente.',
      'Para consultas sobre estas condiciones puedes escribir a soporte@casaseg.com.',
    ],
    note: 'La eliminación de una cuenta no cancela automáticamente obligaciones, contratos o pagos que ya se encuentren vigentes.',
  },
] as const;

export default function Terms() {
  const copy = useCopy(termsCopy);
  return (
    <LegalPage
      title={copy.title}
      description={copy.description}
      updated="22 jul 2026"
      documentUrl="https://casaseg.com/es/terms"
      summary={copy.summary}
      contactTitle={copy.contactTitle}
      contactDescription={copy.contactDescription}
      contactLabel={copy.contactLabel}
      sections={sections}
    />
  );
}

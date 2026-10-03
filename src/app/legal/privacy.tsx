import { LegalPage } from '@/components/legal-page';
import { defineCopy, useCopy } from '@/providers/i18n-context';

const privacyCopy = defineCopy({
  es: { title: 'Política de Privacidad', description: 'Cómo protegemos y tratamos tus datos personales en CasaSeg.', summary: 'Este documento explica qué datos tratamos, para qué los usamos y cómo puedes ejercer tus derechos.', contactTitle: '¿Tienes alguna pregunta sobre tus datos?', contactDescription: 'Escríbenos desde tu correo asociado a CasaSeg para que podamos verificar tu identidad.', contactLabel: 'Contactar con privacidad' },
  fr: { title: 'Politique de confidentialité', description: 'Comment nous protégeons et traitons vos données personnelles sur CasaSeg.', summary: 'Ce document explique quelles données nous traitons, à quelles fins et comment exercer vos droits.', contactTitle: 'Une question sur vos données ?', contactDescription: 'Écrivez-nous depuis l’adresse e-mail associée à CasaSeg afin que nous puissions vérifier votre identité.', contactLabel: 'Contacter l’équipe confidentialité' },
  en: { title: 'Privacy Policy', description: 'How we protect and process your personal data at CasaSeg.', summary: 'This document explains which data we process, why we use it and how you can exercise your rights.', contactTitle: 'Questions about your data?', contactDescription: 'Write to us from the email linked to CasaSeg so we can verify your identity.', contactLabel: 'Contact the privacy team' },
});

const sections = [
  {
    title: 'Ámbito de esta política',
    body: 'Esta política se aplica al uso de la aplicación, el sitio web y los servicios de CasaSeg. Explica el tratamiento de datos de clientes, propietarios, administradores y visitantes.',
    items: [
      'Se aplica cuando creas una cuenta, exploras propiedades o utilizas funciones autenticadas.',
      'Los servicios externos enlazados desde CasaSeg pueden aplicar sus propias políticas.',
    ],
  },
  {
    title: 'Responsable del tratamiento',
    body: 'CasaSeg gestiona los datos necesarios para prestar la plataforma y atender tus solicitudes. Puedes contactar con el equipo mediante soporte@casaseg.com.',
    note: 'Para proteger tu cuenta, podremos pedirte que confirmes tu identidad antes de responder a una solicitud sobre datos personales.',
  },
  {
    title: 'Datos que recopilamos',
    body: 'Recopilamos únicamente las categorías de datos necesarias para operar, proteger y mejorar el servicio.',
    items: [
      'Datos de cuenta: nombre, correo, avatar, idioma y rol asignado.',
      'Datos de actividad: propiedades guardadas, búsquedas, visitas y preferencias.',
      'Datos operativos: conversaciones, contratos y estado de los pagos.',
      'Datos técnicos: dispositivo, versión de la aplicación, registros de seguridad y diagnóstico.',
    ],
  },
  {
    title: 'Cómo obtenemos los datos',
    body: 'Los datos pueden proceder directamente de ti, de tu actividad en CasaSeg o de proveedores que utilizas para autenticarte y completar operaciones.',
    items: [
      'Información que introduces en formularios o comunicas al soporte.',
      'Eventos generados al utilizar la aplicación y sus funciones.',
      'Datos mínimos facilitados por Google, Apple u otros proveedores autorizados.',
    ],
  },
  {
    title: 'Para qué utilizamos tus datos',
    body: 'Tratamos los datos para ofrecer una experiencia segura y coherente con las responsabilidades de cada rol.',
    items: [
      'Crear y proteger tu cuenta.',
      'Mostrar propiedades, gestionar favoritos, visitas y conversaciones.',
      'Permitir a propietarios administrar anuncios, solicitudes y contratos.',
      'Permitir a administradores supervisar la plataforma de acuerdo con sus permisos.',
      'Prevenir fraude, abuso y accesos no autorizados.',
    ],
  },
  {
    title: 'Bases que permiten el tratamiento',
    body: 'El tratamiento se apoya, según la función utilizada, en la ejecución del servicio solicitado, el cumplimiento de obligaciones legales, tu consentimiento o intereses legítimos de seguridad y mejora.',
    note: 'Cuando el tratamiento dependa del consentimiento, podrás retirarlo desde los ajustes disponibles o contactando con soporte.',
  },
  {
    title: 'Con quién compartimos información',
    body: 'No vendemos tus datos personales. Podemos compartir la información mínima necesaria con proveedores que nos ayudan a operar el servicio.',
    items: [
      'Proveedores de alojamiento, autenticación, almacenamiento y comunicaciones.',
      'Proveedores de pago cuando inicias una operación económica.',
      'Autoridades competentes cuando exista una obligación legal válida.',
      'Otros usuarios únicamente cuando una función lo requiera y resulte visible para ti.',
    ],
  },
  {
    title: 'Transferencias internacionales',
    body: 'Algunos proveedores tecnológicos pueden procesar datos fuera de tu país. En esos casos deben aplicarse mecanismos y garantías adecuados para proteger la información.',
    note: 'Puedes solicitar información adicional sobre las garantías aplicables mediante el canal de privacidad.',
  },
  {
    title: 'Cuánto tiempo conservamos los datos',
    body: 'Conservamos los datos durante el tiempo necesario para prestar el servicio, mantener la seguridad y cumplir obligaciones aplicables.',
    items: [
      'Los datos de cuenta se mantienen mientras la cuenta permanezca activa.',
      'Los registros de seguridad pueden conservarse durante periodos limitados para investigar incidentes.',
      'La información contractual o de pagos puede conservarse durante los plazos legalmente exigidos.',
      'Cuando procede la eliminación, los datos se borran o anonimizan de forma segura.',
    ],
  },
  {
    title: 'Tus derechos y opciones',
    body: 'Puedes solicitar acceso, rectificación, eliminación, limitación, oposición o portabilidad cuando resulte aplicable.',
    items: [
      'Puedes corregir datos básicos desde Mi perfil.',
      'Puedes administrar preferencias desde Ajustes.',
      'Puedes solicitar una revisión escribiendo desde el correo asociado a tu cuenta.',
      'También puedes reclamar ante la autoridad de protección de datos competente.',
    ],
  },
  {
    title: 'Seguridad de la información',
    body: 'Aplicamos medidas técnicas y organizativas para reducir el riesgo de pérdida, uso indebido o acceso no autorizado.',
    items: [
      'Controles de acceso asociados al usuario autenticado y a su rol.',
      'Validaciones en el servidor para operaciones sensibles.',
      'Canales cifrados y enlaces temporales para recursos privados cuando corresponde.',
      'Supervisión y registro de eventos relevantes para la seguridad.',
    ],
  },
  {
    title: 'Privacidad de menores',
    body: 'CasaSeg no está dirigida a menores que no tengan capacidad legal para contratar o utilizar el servicio sin autorización. Si detectamos una cuenta creada en contra de este requisito, podremos limitarla o eliminarla.',
  },
  {
    title: 'Cookies y tecnologías similares',
    body: 'En la web podemos utilizar almacenamiento local, cookies esenciales y tecnologías equivalentes para mantener la sesión, recordar preferencias y proteger el servicio.',
    items: [
      'Las tecnologías estrictamente necesarias permiten el funcionamiento básico.',
      'Las preferencias opcionales deben respetar las elecciones disponibles para el usuario.',
      'La aplicación móvil puede utilizar identificadores técnicos para seguridad y diagnóstico.',
    ],
  },
  {
    title: 'Decisiones automatizadas',
    body: 'Podemos utilizar señales automáticas para detectar fraude, abuso o actividad anómala. No adoptamos decisiones con efectos jurídicos basadas únicamente en un proceso automatizado sin las garantías exigibles.',
  },
  {
    title: 'Cambios y contacto',
    body: 'Podemos actualizar esta política cuando cambien el servicio, las medidas de seguridad o los requisitos aplicables. La fecha de actualización siempre aparecerá al inicio del documento.',
    items: [
      'Las modificaciones relevantes deben comunicarse dentro de CasaSeg o por un canal de contacto válido.',
      'Para consultas o solicitudes de privacidad puedes escribir a soporte@casaseg.com.',
    ],
  },
] as const;

export default function Privacy() {
  const copy = useCopy(privacyCopy);
  return (
    <LegalPage
      title={copy.title}
      description={copy.description}
      updated="22 jul 2026"
      documentUrl="https://casaseg.com/es/privacy"
      summary={copy.summary}
      contactTitle={copy.contactTitle}
      contactDescription={copy.contactDescription}
      contactLabel={copy.contactLabel}
      sections={sections}
    />
  );
}

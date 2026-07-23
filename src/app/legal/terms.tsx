import { LegalPage } from '@/components/legal-page';

const sections = [
  { title: 'Uso de CasaSeg', body: 'CasaSeg facilita la búsqueda, publicación y gestión de propiedades. Debes proporcionar información veraz y utilizar la plataforma de forma lícita y respetuosa.' },
  { title: 'Publicaciones y disponibilidad', body: 'Los propietarios son responsables de mantener actualizados los datos de sus propiedades. La disponibilidad puede cambiar hasta que exista una confirmación formal.' },
  { title: 'Pagos y contratos', body: 'Los importes se calculan y confirman en el servidor. Los contratos muestran una versión identificable y las firmas requieren una confirmación segura.' },
  { title: 'Seguridad de la cuenta', body: 'Debes proteger tus credenciales y avisarnos si detectas un acceso no autorizado. Podemos limitar temporalmente funciones para prevenir abuso o fraude.' },
  { title: 'Cambios del servicio', body: 'Podemos mejorar funciones o actualizar estas condiciones. Cuando un cambio sea relevante, lo comunicaremos dentro de la aplicación.' },
];

export default function Terms() {
  return <LegalPage title="Términos de uso" description="Condiciones aplicables al uso de CasaSeg." updated="22 jul 2026" sections={sections} />;
}

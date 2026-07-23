import { LegalPage } from '@/components/legal-page';

const sections = [
  { title: 'Datos que utilizamos', body: 'Tratamos la información de tu cuenta, tus preferencias, las propiedades guardadas y los datos necesarios para gestionar visitas, conversaciones, contratos y pagos.' },
  { title: 'Por qué los necesitamos', body: 'Usamos estos datos para prestar el servicio, proteger tu cuenta, prevenir fraude, personalizar la experiencia y cumplir obligaciones legales aplicables.' },
  { title: 'Seguridad y conservación', body: 'Aplicamos controles de acceso y validaciones en el servidor. Conservamos la información solo durante el tiempo necesario para prestar el servicio y atender obligaciones legales.' },
  { title: 'Tus decisiones', body: 'Puedes actualizar tus preferencias desde Ajustes y solicitar acceso, corrección o eliminación de tus datos mediante el centro de ayuda.' },
];

export default function Privacy() {
  return <LegalPage title="Privacidad" description="Cómo protegemos y tratamos tus datos personales." updated="22 jul 2026" sections={sections} />;
}

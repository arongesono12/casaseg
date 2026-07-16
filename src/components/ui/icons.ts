import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createElement, type ComponentProps } from 'react';

type MaterialIconProps = ComponentProps<typeof MaterialCommunityIcons>;
type GlyphName = MaterialIconProps['name'];

export type IconProps = Omit<MaterialIconProps, 'name'> & {
  fill?: string;
  strokeWidth?: number;
};

function createIcon(outlineName: GlyphName, filledName: GlyphName = outlineName) {
  function ProjectIcon({ fill, strokeWidth: _strokeWidth, ...props }: IconProps) {
    const isFilled = Boolean(fill && fill !== 'none' && fill !== 'transparent');

    return createElement(MaterialCommunityIcons, {
      ...props,
      name: isFilled ? filledName : outlineName,
    });
  }

  ProjectIcon.displayName = `CasaSegIcon(${outlineName})`;
  return ProjectIcon;
}

export const ArrowDown = createIcon('arrow-down');
export const ArrowLeft = createIcon('arrow-left');
export const ArrowRight = createIcon('arrow-right');
export const ArrowUp = createIcon('arrow-up');
export const Bath = createIcon('bathtub-outline', 'bathtub');
export const BedDouble = createIcon('bed-king-outline', 'bed-king');
export const Bell = createIcon('bell-outline', 'bell');
export const Building2 = createIcon('office-building-outline', 'office-building');
export const Camera = createIcon('camera-outline', 'camera');
export const Check = createIcon('check');
export const CheckCircle2 = createIcon('check-circle-outline', 'check-circle');
export const ChevronDown = createIcon('chevron-down');
export const Compass = createIcon('compass-outline', 'compass');
export const CreditCard = createIcon('credit-card-outline', 'credit-card');
export const Eye = createIcon('eye-outline', 'eye');
export const EyeOff = createIcon('eye-off-outline', 'eye-off');
export const FileText = createIcon('file-document-outline', 'file-document');
export const Heart = createIcon('heart-outline', 'heart');
export const Home = createIcon('home-outline', 'home');
export const ImagePlus = createIcon('image-plus');
export const KeyRound = createIcon('key-outline', 'key');
export const Layers3 = createIcon('layers-outline', 'layers');
export const List = createIcon('format-list-bulleted');
export const LocateFixed = createIcon('crosshairs-gps');
export const LogOut = createIcon('logout');
export const Map = createIcon('map-outline', 'map');
export const MapPin = createIcon('map-marker-outline', 'map-marker');
export const MapPinned = createIcon('map-marker-check-outline', 'map-marker-check');
export const Maximize2 = createIcon('arrow-expand-all');
export const MessageCircle = createIcon('message-outline', 'message');
export const Plus = createIcon('plus');
export const RefreshCw = createIcon('refresh');
export const Search = createIcon('magnify');
export const Send = createIcon('send-outline', 'send');
export const Settings = createIcon('cog-outline', 'cog');
export const ShieldCheck = createIcon('shield-check-outline', 'shield-check');
export const SlidersHorizontal = createIcon('tune-variant');
export const Star = createIcon('star-outline', 'star');
export const Trash2 = createIcon('trash-can-outline', 'trash-can');
export const UserRound = createIcon('account-circle-outline', 'account-circle');
export const UsersRound = createIcon('account-group-outline', 'account-group');
export const X = createIcon('close');

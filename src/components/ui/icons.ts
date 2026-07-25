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
export const AlertCircle = createIcon('alert-circle-outline', 'alert-circle');
export const Bath = createIcon('bathtub-outline', 'bathtub');
export const BedDouble = createIcon('bed-king-outline', 'bed-king');
export const Bell = createIcon('bell-outline', 'bell');
export const Building2 = createIcon('office-building-outline', 'office-building');
export const Calendar = createIcon('calendar-blank-outline', 'calendar');
export const Camera = createIcon('camera-outline', 'camera');
export const ChartLine = createIcon('chart-line');
export const Check = createIcon('check');
export const CheckCircle2 = createIcon('check-circle-outline', 'check-circle');
export const ChevronDown = createIcon('chevron-down');
export const ChevronRight = createIcon('chevron-right');
export const ChevronUp = createIcon('chevron-up');
export const Clock = createIcon('clock-outline', 'clock');
export const Compass = createIcon('compass-outline', 'compass');
export const Crown = createIcon('crown-outline', 'crown');
export const CreditCard = createIcon('credit-card-outline', 'credit-card');
export const ExternalLink = createIcon('open-in-new');
export const Eye = createIcon('eye-outline', 'eye');
export const EyeOff = createIcon('eye-off-outline', 'eye-off');
export const FileText = createIcon('file-document-outline', 'file-document');
export const Grid2X2 = createIcon('view-grid-outline', 'view-grid');
export const Heart = createIcon('heart-outline', 'heart');
export const HelpCircle = createIcon('help-circle-outline', 'help-circle');
export const Home = createIcon('home-outline', 'home');
export const HomeCheck = createIcon('home-outline', 'home');
export const ImagePlus = createIcon('image-plus');
export const Inbox = createIcon('inbox-outline', 'inbox');
export const Info = createIcon('information-outline', 'information');
export const KeyRound = createIcon('key-outline', 'key');
export const Layers3 = createIcon('layers-outline', 'layers');
export const List = createIcon('format-list-bulleted');
export const Lock = createIcon('lock-outline', 'lock');
export const LocateFixed = createIcon('crosshairs-gps');
export const LogOut = createIcon('logout');
export const Mail = createIcon('email-outline', 'email');
export const Map = createIcon('map-outline', 'map');
export const MapPin = createIcon('map-marker-outline', 'map-marker');
export const MapPinned = createIcon('map-marker-check-outline', 'map-marker-check');
export const Maximize2 = createIcon('arrow-expand-all');
export const MessageCircle = createIcon('message-outline', 'message');
export const MessagesSquare = createIcon('message-text-outline', 'message-text');
export const Moon = createIcon('weather-night');
export const Plus = createIcon('plus');
export const RefreshCw = createIcon('refresh');
export const Search = createIcon('magnify');
export const Send = createIcon('send-outline', 'send');
export const Share2 = createIcon('share-variant-outline', 'share-variant');
export const Settings = createIcon('cog-outline', 'cog');
export const ShieldCheck = createIcon('shield-check-outline', 'shield-check');
export const SlidersHorizontal = createIcon('tune-variant');
export const Sparkles = createIcon('creation-outline', 'creation');
export const Star = createIcon('star-outline', 'star');
export const Sun = createIcon('white-balance-sunny');
export const Trash2 = createIcon('trash-can-outline', 'trash-can');
export const TrendingUp = createIcon('trending-up');
export const UserRound = createIcon('account-circle-outline', 'account-circle');
export const UsersRound = createIcon('account-group-outline', 'account-group');
export const Wallet = createIcon('wallet-outline', 'wallet');
export const X = createIcon('close');
export const XCircle = createIcon('close-circle-outline', 'close-circle');
export const Zap = createIcon('lightning-bolt-outline', 'lightning-bolt');

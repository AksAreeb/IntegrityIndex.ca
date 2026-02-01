declare module "react-simple-maps" {
  import { FC, ReactNode } from "react";

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
    };
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: object[] }) => ReactNode;
  }

  interface GeographyProps {
    geography: object;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    onMouseEnter?: (evt: React.MouseEvent<SVGPathElement>, geo: object) => void;
    onMouseMove?: (evt: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: () => void;
    onClick?: (evt: React.MouseEvent, geo: object) => void;
  }

  export const ComposableMap: FC<ComposableMapProps>;
  export const Geographies: FC<GeographiesProps>;
  export const Geography: FC<GeographyProps>;
}

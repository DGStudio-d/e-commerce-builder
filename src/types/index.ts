export interface ComponentStyles {
  padding?: string;
  margin?: string;
  bg?: string;
  color?: string;
  border?: string;
  rounded?: string;
  shadow?: string;
  font?: string;
  text?: string;
  display?: string;
  flex?: string;
  justify?: string;
  align?: string;
  gap?: string;
  width?: string;
  height?: string;
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  z?: string;
  grid?: string;
  cursor?: string;
  transition?: string;
  transform?: string;
  opacity?: string;
  object?: string;
  resize?: string;
  focus?: string;
  leading?: string;
  [key: string]: string | undefined;
}

export interface ComponentProps {
  text?: string;
  src?: string;
  alt?: string;
  href?: string;
  target?: string;
  placeholder?: string;
  type?: string;
  rows?: string | number;
  onClick?: string;
  children?: ComponentDefinition[];
  [key: string]: any;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  type: string;
  uniqueId: string;
  props: ComponentProps;
  styles: ComponentStyles;
}

export interface GlobalStyles {
  theme?: Record<string, any>;
  defaults?: Record<string, ComponentStyles>;
  [key: string]: any;
}

export interface ProjectData {
  components: ComponentDefinition[];
  globalStyles: GlobalStyles;
  timestamp: string;
}

export type ExportFormat = 'zip' | 'json';

export type ComponentType = 
  | 'button' 
  | 'p' 
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'img' 
  | 'input' 
  | 'textarea' 
  | 'a' 
  | 'div' 
  | 'section' 
  | 'article' 
  | 'header' 
  | 'footer' 
  | 'nav' 
  | 'main' 
  | 'aside'
  | 'form'
  | 'dropdown'
  | 'dropdownItem';

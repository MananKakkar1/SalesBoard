//Common button component used throughout the website.
import styled from '@emotion/styled';

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing(1)} ${props => props.theme.spacing(2)};
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.75;
  border-radius: ${props => props.theme.borderRadius};
  cursor: pointer;

  /* Variant styles */
  background-color: ${props => {
    if (props.variant === 'outlined') return 'transparent';
    if (props.variant === 'text') return 'transparent';
    return props.theme.colors[props.color || 'primary'];
  }};
  
  color: ${props => {
    if (props.variant === 'outlined' || props.variant === 'text') 
      return props.theme.colors[props.color || 'primary'];
    return '#fff';
  }};
  
  &:hover {
    background-color: ${props => {
      if (props.variant === 'outlined' || props.variant === 'text') 
        return `rgba(${props.theme.colors[props.color || 'primary']}, 0.08)`;
      return props.disabled ? '' : props.theme.colors[props.color || 'primary'] + 'dd';
    }};
  }
  
  &:disabled {
    color: ${props => props.theme.colors.text.disabled};
    background-color: ${props => 
      props.variant === 'contained' ? 'rgba(0, 0, 0, 0.12)' : 'transparent'};
    cursor: default;
    pointer-events: none;
  }
  
  /* Size variations */
  ${props => props.size === 'small' && `
    padding: ${props.theme.spacing(0.5)} ${props.theme.spacing(1)};
    font-size: 0.8125rem;
  `}
  
  ${props => props.size === 'large' && `
    padding: ${props.theme.spacing(1.5)} ${props.theme.spacing(3)};
    font-size: 0.9375rem;
  `}
  
  /* Full width option */
  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

export default Button;

import styled from '@emotion/styled';

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${props => props.theme.spacing(2)};
  width: ${props => props.fullWidth ? '100%' : 'auto'};
`;

const Label = styled.label`
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: 0.875rem;
  color: ${props => props.error ? props.theme.colors.error : props.theme.colors.text.secondary};
  margin-bottom: ${props => props.theme.spacing(0.5)};
`;

const StyledInput = styled.input`
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: 1rem;
  line-height: 1.5;
  color: ${props => props.theme.colors.text.primary};
  background-color: ${props => props.theme.colors.paper};
  border: 1px solid ${props => 
    props.error ? props.theme.colors.error : 'rgba(0, 0, 0, 0.23)'};
  border-radius: ${props => props.theme.borderRadius};
  padding: ${props => props.theme.spacing(1)} ${props => props.theme.spacing(1.5)};
  transition: border-color 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  
  &:focus {
    outline: none;
    border-color: ${props => 
      props.error ? props.theme.colors.error : props.theme.colors.primary};
  }
  
  &:disabled {
    background-color: rgba(0, 0, 0, 0.12);
    color: ${props => props.theme.colors.text.disabled};
    cursor: default;
  }
`;

const ErrorText = styled.div`
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: 0.75rem;
  color: ${props => props.theme.colors.error};
  margin-top: ${props => props.theme.spacing(0.5)};
`;

const InputField = ({
  id,
  label,
  error,
  helperText,
  fullWidth = false,
  required = false,
  ...props
}) => {
  return (
    <InputContainer fullWidth={fullWidth}>
      {label && (
        <Label htmlFor={id} error={!!error}>
          {label}{required && ' *'}
        </Label>
      )}
      <StyledInput 
        id={id}
        error={!!error}
        aria-invalid={!!error}
        {...props}
        value={props.value ?? ""} // Ensure value is never null
      />
      {(error && helperText) && <ErrorText>{helperText}</ErrorText>}
    </InputContainer>
  );
};

export default InputField;

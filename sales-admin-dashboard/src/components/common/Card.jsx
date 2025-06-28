//Common card component used throughout the website for better organization.
import styled from '@emotion/styled';

const Card = styled.div`
  background-color: ${props => props.theme.colors.paper};
  border-radius: ${props => props.theme.borderRadius};
  box-shadow: ${props => props.theme.shadows.sm};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const CardHeader = styled.div`
  padding: ${props => props.theme.spacing(2)};
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2, h3, h4, h5, h6 {
    margin: 0;
  }
`;

export const CardContent = styled.div`
  padding: ${props => props.theme.spacing(2)};
  flex-grow: 1;
`;

export const CardActions = styled.div`
  display: flex;
  justify-content: ${props => props.align === 'right' ? 'flex-end' : 
                          props.align === 'center' ? 'center' : 'flex-start'};
  padding: ${props => props.theme.spacing(1)} ${props => props.theme.spacing(2)};
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  
  > * + * {
    margin-left: ${props => props.theme.spacing(1)};
  }
`;

export default Card;
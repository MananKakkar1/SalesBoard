//Header for all pages on this website.
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import Button from '../common/Button';

const HeaderWrapper = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.theme.spacing(2)};
  background-color: ${props => props.theme.colors.paper};
  box-shadow: ${props => props.theme.shadows.sm};
`;

const Logo = styled.div`
  font-size: 1.25rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
`;

const UserName = styled.span`
  margin-right: ${props => props.theme.spacing(2)};
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const Header = ({ toggleSidebar }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const handleLogout = () => {
    dispatch(logout());
  };
  
  return (
    <HeaderWrapper>
      <Logo>SalesBoard</Logo>
      
      <UserSection>
        {user && <UserName>Welcome, {user.name}</UserName>}
        <Button 
          size="small" 
          variant="outlined"
          color="secondary"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </UserSection>
    </HeaderWrapper>
  );
};

export default Header;
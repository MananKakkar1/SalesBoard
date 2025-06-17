import { NavLink } from 'react-router-dom';
import styled from '@emotion/styled';

const SidebarWrapper = styled.nav`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${props => props.theme.spacing(2)} 0;
`;

const SidebarHeader = styled.div`
  padding: ${props => props.theme.spacing(1)} ${props => props.theme.spacing(2)};
  margin-bottom: ${props => props.theme.spacing(2)};
  font-size: 1.25rem;
  font-weight: bold;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const NavItem = styled.li`
  margin-bottom: ${props => props.theme.spacing(0.5)};
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: ${props => props.theme.spacing(1)} ${props => props.theme.spacing(2)};
  color: ${props => props.theme.colors.text.primary};
  text-decoration: none;
  border-radius: 0;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &.active {
    color: ${props => props.theme.colors.primary};
    background-color: rgba(63, 81, 181, 0.08);
    border-right: 3px solid ${props => props.theme.colors.primary};
  }
`;

const Sidebar = () => {
  return (
    <SidebarWrapper>
      <SidebarHeader>
        Sales Admin
      </SidebarHeader>
      
      <NavList>
        <NavItem>
          <StyledNavLink to="/" end>
            Dashboard
          </StyledNavLink>
        </NavItem>
        <NavItem>
          <StyledNavLink to="/customers">
            Customers
          </StyledNavLink>
        </NavItem>
        <NavItem>
          <StyledNavLink to="/products">
            Products
          </StyledNavLink>
        </NavItem>
        <NavItem>
          <StyledNavLink to="/orders">
            Orders
          </StyledNavLink>
        </NavItem>
      </NavList>
    </SidebarWrapper>
  );
};

export default Sidebar;
//General layout that is used for all pages but login on this website.
import { useState } from "react";
import { Outlet } from "react-router-dom";
import styled from "@emotion/styled";
import Header from "./Header";
import Sidebar from "./Sidebar";

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const SidebarContainer = styled.aside`
  width: 250px;
  background-color: ${(props) => props.theme.colors.paper};
  box-shadow: ${(props) => props.theme.shadows.sm};
  z-index: 10;
  flex-shrink: 0;

  @media (max-width: ${(props) => props.theme.breakpoints.md}) {
    position: fixed;
    left: ${(props) => (props.sidebarOpen ? 0 : "-250px")};
    top: 0;
    height: 100%;
    transition: left 0.3s ease;
  }
`;

const MainContainer = styled.main`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.background};
`;

const HeaderContainer = styled.header`
  position: sticky;
  top: 0;
  z-index: 5;
`;

const ContentContainer = styled.div`
  padding: ${(props) => props.theme.spacing(3)};
  flex-grow: 1;
`;

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <LayoutContainer>
      <SidebarContainer sidebarOpen={sidebarOpen}>
        <Sidebar />
      </SidebarContainer>

      <MainContainer>
        <HeaderContainer>
          <Header toggleSidebar={toggleSidebar} />
        </HeaderContainer>

        <ContentContainer>
          <Outlet />
        </ContentContainer>
      </MainContainer>
    </LayoutContainer>
  );
};

export default Layout;

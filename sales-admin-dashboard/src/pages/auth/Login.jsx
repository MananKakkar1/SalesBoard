import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { login, clearAuthError } from '../../features/auth/authSlice';
import Card, { CardHeader, CardContent } from '../../components/common/Card';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
`;

const LoginHeader = styled(CardHeader)`
  text-align: center;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  margin-bottom: ${props => props.theme.spacing(2)};
  padding: ${props => props.theme.spacing(1)};
  background-color: ${props => `${props.theme.colors.error}15`};
  border-radius: ${props => props.theme.borderRadius};
  text-align: center;
`;

const LoginButton = styled(Button)`
  margin-top: ${props => props.theme.spacing(2)};
`;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, status, error } = useSelector(state => state.auth);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    return () => {
      dispatch(clearAuthError());
    };
  }, [isAuthenticated, navigate, dispatch]);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      dispatch(login({ username, accessKey: password }));
    }
  };
  
  return (
    <LoginContainer>
      <LoginCard>
        <LoginHeader>
          <h2>Sales Admin Dashboard</h2>
        </LoginHeader>
        <CardContent>
          <FormContainer onSubmit={handleSubmit}>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            
            <InputField
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={!!errors.username}
              helperText={errors.username}
              fullWidth
              required
            />
            
            <InputField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              fullWidth
              required
            />
            
            <LoginButton
              type="submit"
              color="primary"
              fullWidth
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Signing in...' : 'Sign In'}
            </LoginButton>
          </FormContainer>
        </CardContent>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;

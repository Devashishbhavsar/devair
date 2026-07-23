// Import necessary components and hooks
import React from 'react';
import { Box, Button, Container, Heading, Text } from '@chakra-ui/react';

// Define the LandingPage component
const LandingPage = () => {
  return (
    <Container maxW='container.xl' py={24}>
      <Box textAlign='center'>
        <Heading as='h1' fontSize='5xl' mb={4}>Welcome to DevAir</Heading>
        <Text as='p' fontSize='3xl' mb={8}>Experience the latest in design and technology.</Text>
        <Button colorScheme='teal' size='lg'>Get Started</Button>
      </Box>
    </Container>
  );};

// Export the LandingPage component
export default LandingPage;

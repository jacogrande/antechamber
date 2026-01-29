import { Component, type ReactNode } from 'react'
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Card,
  CardBody,
  Center,
} from '@chakra-ui/react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center minH="100vh" bg="bg.canvas" p={4}>
          <Card maxW="lg" w="full" variant="outline">
            <CardBody>
              <VStack spacing={4} textAlign="center">
                <Heading size="lg" color="red.500">
                  Something went wrong
                </Heading>
                <Text color="text.muted">
                  An unexpected error occurred. Please try reloading the page.
                </Text>
                {this.state.error && (
                  <Box
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                    w="full"
                    textAlign="left"
                    fontFamily="mono"
                    fontSize="sm"
                    color="gray.600"
                    maxH="150px"
                    overflowY="auto"
                  >
                    {this.state.error.message}
                  </Box>
                )}
                <Box pt={2}>
                  <Button variant="primary" onClick={this.handleReload} mr={3}>
                    Reload Page
                  </Button>
                  <Button variant="ghost" onClick={this.handleReset}>
                    Try Again
                  </Button>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </Center>
      )
    }

    return this.props.children
  }
}

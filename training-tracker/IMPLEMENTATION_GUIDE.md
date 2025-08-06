# 🛠️ TrainingSync - Implementation Guide

## 🚀 Tech Stack Deep Dive

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Material-UI v5** for component library
- **Framer Motion** for smooth animations
- **React Router v6** for navigation
- **Axios** for API communication
- **Recharts** for data visualization
- **React Hook Form** for form management
- **Zustand** for state management

### Backend Stack
- **Spring Boot 3.x** with Java 17
- **Spring Data JPA** for database operations
- **Spring Security** for authentication
- **H2/PostgreSQL** for database
- **Maven** for dependency management
- **Spring Boot DevTools** for hot reload

## 📂 Project Structure

```
training-tracker/
├── frontend/                 # React TypeScript App
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # Reusable UI components
│   │   │   ├── dashboard/   # Dashboard specific components
│   │   │   ├── training/    # Training management components
│   │   │   └── associate/   # Associate profile components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── stores/          # Zustand state stores
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── theme/           # Material-UI theme configuration
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # Spring Boot API
│   ├── src/main/java/com/trainingtracker/
│   │   ├── entity/          # JPA entities
│   │   ├── repository/      # Data repositories
│   │   ├── service/         # Business logic
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Data transfer objects
│   │   ├── config/          # Configuration classes
│   │   └── security/        # Security configuration
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── data.sql         # Sample data
│   └── pom.xml
└── database/
    ├── schema.sql           # Database schema
    └── seed-data.sql        # Initial data
```

## 🎨 Frontend Implementation Examples

### 1. Theme Configuration
```typescript
// src/theme/index.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#00d4ff',
      dark: '#1a2332',
    },
    secondary: {
      main: '#00c896',
    },
    warning: {
      main: '#ff6b35',
    },
    background: {
      default: '#f8f9fb',
      paper: '#ffffff',
    },
  },
  typography: {
    h1: {
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
  },
});
```

### 2. Training Card Component
```typescript
// src/components/training/TrainingCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Box,
} from '@mui/material';
import { motion } from 'framer-motion';
import { Training } from '../../types/training';

interface TrainingCardProps {
  training: Training;
  onContinue: (id: number) => void;
  onBookmark: (id: number) => void;
}

export const TrainingCard: React.FC<TrainingCardProps> = ({
  training,
  onContinue,
  onBookmark,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'primary';
      case 'OVERDUE': return 'error';
      default: return 'default';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ maxWidth: 345, position: 'relative' }}>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            🚀 {training.title}
          </Typography>
          
          <Box display="flex" gap={1} mb={2}>
            <Chip
              label={training.category}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={training.difficultyLevel}
              size="small"
              color={getStatusColor(training.status)}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            📅 Due: {new Date(training.dueDate).toLocaleDateString()}
            <br />
            ⏱️ {training.estimatedDurationHours}h
          </Typography>

          <Box mb={2}>
            <Typography variant="body2" gutterBottom>
              Progress: {training.progressPercentage}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={training.progressPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Skills: {training.skills.join(', ')}
          </Typography>
        </CardContent>

        <CardActions>
          <Button
            size="small"
            variant="contained"
            onClick={() => onContinue(training.id)}
          >
            🎯 Continue Training
          </Button>
          <Button
            size="small"
            onClick={() => onBookmark(training.id)}
          >
            ⭐ Bookmark
          </Button>
        </CardActions>
      </Card>
    </motion.div>
  );
};
```

### 3. Progress Ring Component
```typescript
// src/components/common/ProgressRing.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#00d4ff',
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      position="relative"
    >
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          stroke="#e6e6e6"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        textAlign="center"
      >
        <Typography variant="h4" fontWeight="bold">
          {progress}%
        </Typography>
        {label && (
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
```

### 4. State Management with Zustand
```typescript
// src/stores/trainingStore.ts
import { create } from 'zustand';
import { Training, TrainingFilters } from '../types/training';
import { trainingService } from '../services/trainingService';

interface TrainingState {
  trainings: Training[];
  filters: TrainingFilters;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchTrainings: () => Promise<void>;
  updateFilters: (filters: Partial<TrainingFilters>) => void;
  updateTrainingProgress: (id: number, progress: number) => Promise<void>;
  completeTraining: (id: number) => Promise<void>;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  trainings: [],
  filters: {
    category: '',
    status: '',
    difficulty: '',
    search: '',
  },
  loading: false,
  error: null,

  fetchTrainings: async () => {
    set({ loading: true, error: null });
    try {
      const trainings = await trainingService.getTrainings(get().filters);
      set({ trainings, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch trainings', loading: false });
    }
  },

  updateFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchTrainings();
  },

  updateTrainingProgress: async (id, progress) => {
    try {
      await trainingService.updateProgress(id, progress);
      set((state) => ({
        trainings: state.trainings.map((training) =>
          training.id === id
            ? { ...training, progressPercentage: progress }
            : training
        ),
      }));
    } catch (error) {
      set({ error: 'Failed to update progress' });
    }
  },

  completeTraining: async (id) => {
    try {
      await trainingService.completeTraining(id);
      set((state) => ({
        trainings: state.trainings.map((training) =>
          training.id === id
            ? { ...training, status: 'COMPLETED', progressPercentage: 100 }
            : training
        ),
      }));
    } catch (error) {
      set({ error: 'Failed to complete training' });
    }
  },
}));
```

## 🔧 Backend Implementation Examples

### 1. Training Entity
```java
// src/main/java/com/trainingtracker/entity/Training.java
@Entity
@Table(name = "trainings")
public class Training {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String category;

    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficultyLevel;

    @Column(name = "estimated_duration_hours")
    private Integer estimatedDurationHours;

    @Column(name = "is_mandatory")
    private Boolean isMandatory = false;

    @Column(name = "expiry_months")
    private Integer expiryMonths;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private Associate createdBy;

    @OneToMany(mappedBy = "training", cascade = CascadeType.ALL)
    private Set<TrainingAssignment> assignments = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "training_skills",
        joinColumns = @JoinColumn(name = "training_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> skills = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors, getters, and setters
}

enum DifficultyLevel {
    BEGINNER, INTERMEDIATE, ADVANCED
}
```

### 2. Training Service Layer
```java
// src/main/java/com/trainingtracker/service/TrainingService.java
@Service
@Transactional
public class TrainingService {

    private final TrainingRepository trainingRepository;
    private final TrainingAssignmentRepository assignmentRepository;
    private final AssociateRepository associateRepository;

    public TrainingService(TrainingRepository trainingRepository,
                          TrainingAssignmentRepository assignmentRepository,
                          AssociateRepository associateRepository) {
        this.trainingRepository = trainingRepository;
        this.assignmentRepository = assignmentRepository;
        this.associateRepository = associateRepository;
    }

    public List<TrainingDTO> getTrainingsForAssociate(Long associateId, TrainingFilters filters) {
        Specification<TrainingAssignment> spec = TrainingSpecifications
            .forAssociate(associateId)
            .and(TrainingSpecifications.withFilters(filters));
        
        return assignmentRepository.findAll(spec)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    public TrainingDTO createTraining(CreateTrainingRequest request) {
        Training training = new Training();
        training.setTitle(request.getTitle());
        training.setDescription(request.getDescription());
        training.setCategory(request.getCategory());
        training.setDifficultyLevel(request.getDifficultyLevel());
        training.setEstimatedDurationHours(request.getEstimatedDurationHours());
        training.setIsMandatory(request.getIsMandatory());
        
        // Set skills
        Set<Skill> skills = request.getSkillIds().stream()
            .map(skillId -> skillRepository.findById(skillId)
                .orElseThrow(() -> new EntityNotFoundException("Skill not found")))
            .collect(Collectors.toSet());
        training.setSkills(skills);

        Training savedTraining = trainingRepository.save(training);
        return convertToDTO(savedTraining);
    }

    public void assignTrainingToAssociate(Long trainingId, Long associateId, LocalDate dueDate) {
        Training training = trainingRepository.findById(trainingId)
            .orElseThrow(() -> new EntityNotFoundException("Training not found"));
        
        Associate associate = associateRepository.findById(associateId)
            .orElseThrow(() -> new EntityNotFoundException("Associate not found"));

        // Check if already assigned
        if (assignmentRepository.findByAssociateAndTraining(associate, training).isPresent()) {
            throw new IllegalStateException("Training already assigned to this associate");
        }

        TrainingAssignment assignment = new TrainingAssignment();
        assignment.setAssociate(associate);
        assignment.setTraining(training);
        assignment.setAssignedDate(LocalDate.now());
        assignment.setDueDate(dueDate);
        assignment.setStatus(TrainingStatus.ASSIGNED);
        assignment.setProgressPercentage(0);

        assignmentRepository.save(assignment);

        // Update associate skills
        updateAssociateSkills(associate, training.getSkills());
    }

    public void updateTrainingProgress(Long assignmentId, Integer progressPercentage) {
        TrainingAssignment assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new EntityNotFoundException("Assignment not found"));

        assignment.setProgressPercentage(progressPercentage);
        
        if (progressPercentage == 100 && assignment.getStatus() != TrainingStatus.COMPLETED) {
            assignment.setStatus(TrainingStatus.COMPLETED);
            assignment.setCompletedDate(LocalDate.now());
            
            // Award achievements
            achievementService.checkAndAwardAchievements(assignment.getAssociate());
        } else if (progressPercentage > 0 && assignment.getStatus() == TrainingStatus.ASSIGNED) {
            assignment.setStatus(TrainingStatus.IN_PROGRESS);
            assignment.setStartedDate(LocalDate.now());
        }

        assignmentRepository.save(assignment);
    }

    private void updateAssociateSkills(Associate associate, Set<Skill> trainingSkills) {
        for (Skill skill : trainingSkills) {
            AssociateSkill associateSkill = associateSkillRepository
                .findByAssociateAndSkill(associate, skill)
                .orElse(new AssociateSkill(associate, skill, 1));
            
            // Increment skill level (max 5)
            if (associateSkill.getProficiencyLevel() < 5) {
                associateSkill.setProficiencyLevel(associateSkill.getProficiencyLevel() + 1);
                associateSkillRepository.save(associateSkill);
            }
        }
    }

    private TrainingDTO convertToDTO(TrainingAssignment assignment) {
        Training training = assignment.getTraining();
        return TrainingDTO.builder()
            .id(assignment.getId())
            .trainingId(training.getId())
            .title(training.getTitle())
            .description(training.getDescription())
            .category(training.getCategory())
            .difficultyLevel(training.getDifficultyLevel())
            .estimatedDurationHours(training.getEstimatedDurationHours())
            .assignedDate(assignment.getAssignedDate())
            .dueDate(assignment.getDueDate())
            .startedDate(assignment.getStartedDate())
            .completedDate(assignment.getCompletedDate())
            .status(assignment.getStatus())
            .progressPercentage(assignment.getProgressPercentage())
            .skills(training.getSkills().stream()
                .map(Skill::getName)
                .collect(Collectors.toList()))
            .build();
    }
}
```

### 3. REST Controller
```java
// src/main/java/com/trainingtracker/controller/TrainingController.java
@RestController
@RequestMapping("/api/trainings")
@CrossOrigin(origins = "http://localhost:3000")
public class TrainingController {

    private final TrainingService trainingService;

    public TrainingController(TrainingService trainingService) {
        this.trainingService = trainingService;
    }

    @GetMapping
    public ResponseEntity<List<TrainingDTO>> getTrainings(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long associateId) {
        
        TrainingFilters filters = TrainingFilters.builder()
            .category(category)
            .status(status)
            .difficulty(difficulty)
            .search(search)
            .build();

        List<TrainingDTO> trainings = associateId != null 
            ? trainingService.getTrainingsForAssociate(associateId, filters)
            : trainingService.getAllTrainings(filters);

        return ResponseEntity.ok(trainings);
    }

    @PostMapping
    public ResponseEntity<TrainingDTO> createTraining(@Valid @RequestBody CreateTrainingRequest request) {
        TrainingDTO training = trainingService.createTraining(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(training);
    }

    @PostMapping("/{trainingId}/assign")
    public ResponseEntity<Void> assignTraining(
            @PathVariable Long trainingId,
            @RequestBody AssignTrainingRequest request) {
        
        trainingService.assignTrainingToAssociate(
            trainingId, 
            request.getAssociateId(), 
            request.getDueDate()
        );
        
        return ResponseEntity.ok().build();
    }

    @PutMapping("/assignments/{assignmentId}/progress")
    public ResponseEntity<Void> updateProgress(
            @PathVariable Long assignmentId,
            @RequestBody UpdateProgressRequest request) {
        
        trainingService.updateTrainingProgress(assignmentId, request.getProgressPercentage());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/analytics/dashboard")
    public ResponseEntity<DashboardMetricsDTO> getDashboardMetrics(
            @RequestParam(required = false) Long associateId) {
        
        DashboardMetricsDTO metrics = trainingService.getDashboardMetrics(associateId);
        return ResponseEntity.ok(metrics);
    }
}
```

## 📊 Database Implementation

### Schema Setup (PostgreSQL)
```sql
-- Create database
CREATE DATABASE training_tracker;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Associates table
CREATE TABLE associates (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trainings table
CREATE TABLE trainings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    estimated_duration_hours INTEGER,
    is_mandatory BOOLEAN DEFAULT FALSE,
    expiry_months INTEGER,
    created_by INTEGER REFERENCES associates(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training assignments
CREATE TABLE training_assignments (
    id SERIAL PRIMARY KEY,
    associate_id INTEGER NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
    training_id INTEGER NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    started_date DATE,
    completed_date DATE,
    status VARCHAR(20) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'EXPIRED')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(associate_id, training_id)
);

-- Create indexes for performance
CREATE INDEX idx_training_assignments_associate ON training_assignments(associate_id);
CREATE INDEX idx_training_assignments_training ON training_assignments(training_id);
CREATE INDEX idx_training_assignments_status ON training_assignments(status);
CREATE INDEX idx_training_assignments_due_date ON training_assignments(due_date);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_associates_updated_at BEFORE UPDATE ON associates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON trainings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_assignments_updated_at BEFORE UPDATE ON training_assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔐 Security Configuration

```java
// src/main/java/com/trainingtracker/security/SecurityConfig.java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/trainings").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/trainings").hasRole("ADMIN")
                .requestMatchers("/api/analytics/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            );
        
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
```

## 🚀 Deployment Configuration

### Frontend Dockerfile
```dockerfile
# Multi-stage build for React app
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile
```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app
COPY target/training-tracker-api-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: training_tracker
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seed-data.sql:/docker-entrypoint-initdb.d/02-seed-data.sql

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/training_tracker
      SPRING_DATASOURCE_USERNAME: admin
      SPRING_DATASOURCE_PASSWORD: password
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## 📈 Performance Optimization Tips

### Frontend
1. **Code Splitting**: Use React.lazy() for route-based splitting
2. **Memoization**: Use React.memo() and useMemo() for expensive calculations
3. **Virtual Scrolling**: Implement for large training lists
4. **Image Optimization**: Use WebP format and lazy loading
5. **Bundle Analysis**: Use webpack-bundle-analyzer

### Backend
1. **Database Indexing**: Add indexes on frequently queried columns
2. **Connection Pooling**: Configure HikariCP for optimal performance
3. **Caching**: Use Spring Cache with Redis for frequently accessed data
4. **Pagination**: Implement proper pagination for large datasets
5. **Query Optimization**: Use JPQL/native queries for complex operations

### Database
1. **Partitioning**: Partition large tables by date
2. **Monitoring**: Set up query performance monitoring
3. **Vacuum**: Regular maintenance for PostgreSQL
4. **Backup Strategy**: Implement automated backups

This implementation guide provides a solid foundation for building the TrainingSync application with modern best practices and scalable architecture patterns.
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserService } from '../services/UserService';

// Configurar estrategia de Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Buscar usuario por Google ID o email
        let user = await UserService.findByGoogleId(profile.id);
        
        if (!user) {
          // Buscar por email en caso de que el usuario ya exista pero sin Google ID
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await UserService.findByEmail(email);
          }
          
          if (user) {
            // Actualizar usuario existente con Google ID y campos opcionales
            const updateExistingData: {
              googleId?: string;
              emailVerified?: boolean;
              avatarUrl?: string;
            } = {
              googleId: profile.id,
              emailVerified: true,
              ...(profile.photos?.[0]?.value ? { avatarUrl: profile.photos[0].value } : {})
            };

            user = await UserService.updateUser(user.id, updateExistingData);
          } else {
            // Crear nuevo usuario con Google usando el método createUser existente
            const userResult = await UserService.createUser({
              email: profile.emails?.[0]?.value!,
              password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2), // Contraseña temporal
              name: profile.displayName,
            });
            
            if (userResult.success && userResult.data) {
              // Actualizar el usuario con Google ID y marcar email como verificado
              const updateData: {
                googleId?: string;
                emailVerified?: boolean;
                avatarUrl?: string;
              } = {
                googleId: profile.id,
                emailVerified: true,
                ...(profile.photos?.[0]?.value ? { avatarUrl: profile.photos[0].value } : {})
              };

              user = await UserService.updateUser(userResult.data.id, updateData);
            } else {
              throw new Error(userResult.error || 'Error creating user');
            }
          }
        }
        
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Serializar usuario para la sesión
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserializar usuario de la sesión
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserService.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
/**
 * Enhanced Settings Page
 * 
 * Redesigned settings using ChatKit form widgets with animations
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';
import { AnimatedPage } from '@/components/ui/animated';
import { EnhancedWidgetRenderer } from '@/components/features/chatkit/EnhancedWidgetRenderer';
import {
  createCard,
  createTitle,
  createText,
  createForm,
  createInput,
  createTextarea,
  createSelect,
  createCheckbox,
  createButton,
  createLabel,
  createDivider,
  createBox,
  createCol,
  type WidgetComponent,
} from '@prisma/lib/openai/chatkit/widgets-complete';
import { useChatKitTheme } from '@/lib/theme';
import { toast } from '@/hooks/use-toast';

export function EnhancedSettings() {
  const { theme, setTheme } = useTheme();
  const { user: currentUser } = useAuth();
  const { currentOrg } = useOrganizations();
  const { setTheme: setChatKitTheme } = useChatKitTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Profile state
  const displayName = currentUser?.user_metadata?.name ?? currentUser?.email ?? '';
  const initialFirst = displayName.split(' ')[0] ?? '';
  const initialLast = displayName.split(' ').slice(1).join(' ');
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [jobTitle, setJobTitle] = useState('Senior Consultant');
  const [bio, setBio] = useState('Experienced professional services consultant.');

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const handleSaveProfile = async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const displayName = `${data.firstName || firstName} ${data.lastName || lastName}`.trim();
      await import('@/lib/iam').then(m => m.updateProfile({
        displayName,
        orgId: currentOrg?.id,
      }));
      toast({ title: "Profile updated successfully" });
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Profile Form Widget
  const profileFormWidget = createForm({
    onSubmitAction: {
      type: 'save_profile',
      payload: {},
    },
    children: [
      createTitle({ value: 'Personal Information', size: 'lg' }),
      createBox({
        direction: 'row',
        gap: 4,
        children: [
          createCol({
            flex: 1,
            gap: 2,
            children: [
              createLabel({ value: 'First Name', fieldName: 'firstName' }),
              createInput({
                name: 'firstName',
                defaultValue: firstName,
                placeholder: 'Enter first name',
                required: true,
              }),
            ],
          }),
          createCol({
            flex: 1,
            gap: 2,
            children: [
              createLabel({ value: 'Last Name', fieldName: 'lastName' }),
              createInput({
                name: 'lastName',
                defaultValue: lastName,
                placeholder: 'Enter last name',
                required: true,
              }),
            ],
          }),
        ],
      }),
      createCol({
        gap: 2,
        children: [
          createLabel({ value: 'Email Address', fieldName: 'email' }),
          createInput({
            name: 'email',
            type: 'email',
            defaultValue: email,
            disabled: true,
          }),
        ],
      }),
      createCol({
        gap: 2,
        children: [
          createLabel({ value: 'Job Title', fieldName: 'jobTitle' }),
          createInput({
            name: 'jobTitle',
            defaultValue: jobTitle,
            placeholder: 'Enter job title',
          }),
        ],
      }),
      createCol({
        gap: 2,
        children: [
          createLabel({ value: 'Bio', fieldName: 'bio' }),
          createTextarea({
            name: 'bio',
            defaultValue: bio,
            placeholder: 'Tell us about yourself...',
            rows: 4,
          }),
        ],
      }),
      createButton({
        label: isLoading ? 'Saving...' : 'Save Changes',
        submit: true,
        color: 'primary',
        disabled: isLoading,
      }),
    ],
    gap: 4,
  });

  // Security Form Widget
  const securityFormWidget = createForm({
    children: [
      createTitle({ value: 'Security', size: 'lg' }),
      createCol({
        gap: 2,
        children: [
          createLabel({ value: 'Current Password', fieldName: 'currentPassword' }),
          createInput({
            name: 'currentPassword',
            type: 'password',
            placeholder: 'Enter current password',
          }),
        ],
      }),
      createCol({
        gap: 2,
        children: [
          createLabel({ value: 'New Password', fieldName: 'newPassword' }),
          createInput({
            name: 'newPassword',
            type: 'password',
            placeholder: 'Enter new password',
          }),
        ],
      }),
      createCol({
        gap: 2,
        children: [
          createLabel({ value: 'Confirm New Password', fieldName: 'confirmPassword' }),
          createInput({
            name: 'confirmPassword',
            type: 'password',
            placeholder: 'Confirm new password',
          }),
        ],
      }),
      createButton({
        label: 'Update Password',
        color: 'primary',
        variant: 'outline',
      }),
    ],
    gap: 4,
  });

  // Notifications Widget
  const notificationsWidget = createCard({
    children: [
      createTitle({ value: 'Notification Preferences', size: 'lg' }),
      createCol({
        gap: 4,
        children: [
          createBox({
            direction: 'row',
            justify: 'between',
            align: 'center',
            children: [
              createCol({
                children: [
                  createText({ value: 'Email Notifications', size: 'sm', weight: 'medium' }),
                  createText({ value: 'Receive notifications via email', size: 'xs', color: 'secondary' }),
                ],
              }),
              createCheckbox({
                name: 'emailNotifications',
                defaultChecked: emailNotifications,
                onChangeAction: {
                  type: 'toggle_notification',
                  payload: { type: 'email' },
                },
              }),
            ],
          }),
          createDivider({ spacing: 2 }),
          createBox({
            direction: 'row',
            justify: 'between',
            align: 'center',
            children: [
              createCol({
                children: [
                  createText({ value: 'Push Notifications', size: 'sm', weight: 'medium' }),
                  createText({ value: 'Get push notifications in your browser', size: 'xs', color: 'secondary' }),
                ],
              }),
              createCheckbox({
                name: 'pushNotifications',
                defaultChecked: pushNotifications,
                onChangeAction: {
                  type: 'toggle_notification',
                  payload: { type: 'push' },
                },
              }),
            ],
          }),
          createDivider({ spacing: 2 }),
          createBox({
            direction: 'row',
            justify: 'between',
            align: 'center',
            children: [
              createCol({
                children: [
                  createText({ value: 'Task Reminders', size: 'sm', weight: 'medium' }),
                  createText({ value: 'Get reminded about upcoming due dates', size: 'xs', color: 'secondary' }),
                ],
              }),
              createCheckbox({
                name: 'taskReminders',
                defaultChecked: taskReminders,
                onChangeAction: {
                  type: 'toggle_notification',
                  payload: { type: 'tasks' },
                },
              }),
            ],
          }),
        ],
      }),
    ],
    padding: 4,
  });

  // Appearance Widget
  const appearanceWidget = createCard({
    children: [
      createTitle({ value: 'Theme & Appearance', size: 'lg' }),
      createCol({
        gap: 4,
        children: [
          createCol({
            gap: 2,
            children: [
              createLabel({ value: 'Theme', fieldName: 'theme' }),
              createSelect({
                name: 'theme',
                defaultValue: theme || 'system',
                options: [
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ],
                onChangeAction: {
                  type: 'change_theme',
                  payload: {},
                },
              }),
            ],
          }),
          createCol({
            gap: 2,
            children: [
              createLabel({ value: 'Language', fieldName: 'language' }),
              createSelect({
                name: 'language',
                defaultValue: 'en',
                options: [
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'de', label: 'German' },
                ],
              }),
            ],
          }),
          createCol({
            gap: 2,
            children: [
              createLabel({ value: 'Timezone', fieldName: 'timezone' }),
              createSelect({
                name: 'timezone',
                defaultValue: 'utc-5',
                options: [
                  { value: 'utc-8', label: 'Pacific Time (UTC-8)' },
                  { value: 'utc-7', label: 'Mountain Time (UTC-7)' },
                  { value: 'utc-6', label: 'Central Time (UTC-6)' },
                  { value: 'utc-5', label: 'Eastern Time (UTC-5)' },
                  { value: 'utc+0', label: 'GMT (UTC+0)' },
                ],
              }),
            ],
          }),
        ],
      }),
    ],
    padding: 4,
  });

  const handleWidgetAction = (action: { type: string; payload?: Record<string, unknown> }) => {
    switch (action.type) {
      case 'save_profile':
        handleSaveProfile(action.payload || {});
        break;
      case 'change_theme':
        if (action.payload?.theme) {
          setTheme(action.payload.theme as string);
        }
        break;
      case 'toggle_notification':
        // Handle notification toggles
        break;
      default:
        console.log('Unhandled action:', action);
    }
  };

  return (
    <AnimatedPage className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <EnhancedWidgetRenderer
          widget={createTitle({ 
            value: 'Settings', 
            size: '3xl',
            weight: 'bold',
          })}
        />
        <EnhancedWidgetRenderer
          widget={createText({ 
            value: 'Configure your account and organization preferences', 
            size: 'md',
            color: 'secondary',
          })}
        />
      </motion.div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <EnhancedWidgetRenderer
          widget={createCard({
            children: [profileFormWidget],
            padding: 4,
          })}
          onAction={handleWidgetAction}
        />
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <EnhancedWidgetRenderer
          widget={createCard({
            children: [securityFormWidget],
            padding: 4,
          })}
        />
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <EnhancedWidgetRenderer
          widget={notificationsWidget}
          onAction={handleWidgetAction}
        />
      </motion.div>

      {/* Appearance Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <EnhancedWidgetRenderer
          widget={appearanceWidget}
          onAction={handleWidgetAction}
        />
      </motion.div>
    </AnimatedPage>
  );
}


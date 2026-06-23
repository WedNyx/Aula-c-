import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export type ClassType = 'matutino' | 'vespertino'

export type AttendanceStatus = 'presente' | 'falta' | 'inativo'

export interface StudentProfile {
  id: string
  fullName: string
  classType: ClassType
  createdAt: string
  lastActiveAt: string
}

export interface CodeFile {
  id: string
  name: string
  content: string
  studentId: string
  lastModified: string
}

export interface LessonSession {
  id: string
  studentId: string
  date: string
  code: string
  summary: string
  questions: Question[]
  studentFeedback: string
  teacherFeedback: string
  status: 'coding' | 'summary' | 'questions' | 'done'
}

export interface Question {
  id: string
  text: string
  options: string[]
  correctIndex: number
  studentAnswer?: number
}

export interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  status: AttendanceStatus
}

export interface CalendarEntry {
  id: string
  date: string
  contentName: string
  city: string
}

export interface TeacherCodeFile {
  id: string
  name: string
  content: string
  lastModified: string
}

interface AppState {
  students: StudentProfile[]
  currentStudent: StudentProfile | null
  files: CodeFile[]
  sessions: LessonSession[]
  attendance: AttendanceRecord[]
  calendarEntries: CalendarEntry[]
  teacherFiles: TeacherCodeFile[]
  activeStudentStatuses: Record<string, string>

  addStudent: (name: string, classType: ClassType) => StudentProfile
  setCurrentStudent: (student: StudentProfile | null) => void
  updateStudentActivity: (studentId: string, status: string) => void
  resetAllStudents: () => void

  addFile: (studentId: string, name: string) => CodeFile
  updateFile: (fileId: string, content: string) => void
  renameFile: (fileId: string, name: string) => void
  deleteFile: (fileId: string) => void
  getStudentFiles: (studentId: string) => CodeFile[]

  startSession: (studentId: string, code: string) => LessonSession
  updateSession: (sessionId: string, updates: Partial<LessonSession>) => void
  getTodaySession: (studentId: string) => LessonSession | undefined

  markAttendance: (studentId: string, status: AttendanceStatus) => void
  getAttendance: (date: string) => AttendanceRecord[]

  addCalendarEntry: (date: string, contentName: string, city: string) => void
  updateCalendarEntry: (id: string, updates: Partial<CalendarEntry>) => void
  getTodayEntry: () => CalendarEntry | undefined

  addTeacherFile: (name: string) => TeacherCodeFile
  updateTeacherFile: (fileId: string, content: string) => void
  renameTeacherFile: (fileId: string, name: string) => void
  deleteTeacherFile: (fileId: string) => void
}

const today = () => new Date().toISOString().split('T')[0]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      students: [],
      currentStudent: null,
      files: [],
      sessions: [],
      attendance: [],
      calendarEntries: [],
      teacherFiles: [],
      activeStudentStatuses: {},

      addStudent: (name, classType) => {
        const student: StudentProfile = {
          id: uuidv4(),
          fullName: name,
          classType,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        }
        set(state => ({ students: [...state.students, student] }))
        const att: AttendanceRecord = {
          id: uuidv4(),
          studentId: student.id,
          date: today(),
          status: 'presente',
        }
        set(state => ({ attendance: [...state.attendance, att] }))
        return student
      },

      setCurrentStudent: (student) => {
        set({ currentStudent: student })
        if (student) {
          set(state => ({
            students: state.students.map(s =>
              s.id === student.id ? { ...s, lastActiveAt: new Date().toISOString() } : s
            ),
            activeStudentStatuses: {
              ...state.activeStudentStatuses,
              [student.id]: 'editor',
            },
          }))
        }
      },

      updateStudentActivity: (studentId, status) => {
        set(state => ({
          activeStudentStatuses: {
            ...state.activeStudentStatuses,
            [studentId]: status,
          },
        }))
      },

      resetAllStudents: () => {
        set({
          students: [],
          currentStudent: null,
          files: [],
          sessions: [],
          attendance: [],
          activeStudentStatuses: {},
        })
      },

      addFile: (studentId, name) => {
        const file: CodeFile = {
          id: uuidv4(),
          name,
          content: '// Novo arquivo C#\nusing System;\n\nclass Program\n{\n    static void Main(string[] args)\n    {\n        Console.WriteLine("Olá, Mundo!");\n    }\n}',
          studentId,
          lastModified: new Date().toISOString(),
        }
        set(state => ({ files: [...state.files, file] }))
        return file
      },

      updateFile: (fileId, content) => {
        set(state => ({
          files: state.files.map(f =>
            f.id === fileId ? { ...f, content, lastModified: new Date().toISOString() } : f
          ),
        }))
      },

      renameFile: (fileId, name) => {
        set(state => ({
          files: state.files.map(f => f.id === fileId ? { ...f, name } : f),
        }))
      },

      deleteFile: (fileId) => {
        set(state => ({ files: state.files.filter(f => f.id !== fileId) }))
      },

      getStudentFiles: (studentId) => {
        return get().files.filter(f => f.studentId === studentId)
      },

      startSession: (studentId, code) => {
        const session: LessonSession = {
          id: uuidv4(),
          studentId,
          date: today(),
          code,
          summary: '',
          questions: [],
          studentFeedback: '',
          teacherFeedback: '',
          status: 'coding',
        }
        set(state => ({ sessions: [...state.sessions, session] }))
        return session
      },

      updateSession: (sessionId, updates) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        }))
      },

      getTodaySession: (studentId) => {
        return get().sessions.find(
          s => s.studentId === studentId && s.date === today()
        )
      },

      markAttendance: (studentId, status) => {
        const existing = get().attendance.find(
          a => a.studentId === studentId && a.date === today()
        )
        if (existing) {
          set(state => ({
            attendance: state.attendance.map(a =>
              a.id === existing.id ? { ...a, status } : a
            ),
          }))
        } else {
          const record: AttendanceRecord = {
            id: uuidv4(),
            studentId,
            date: today(),
            status,
          }
          set(state => ({ attendance: [...state.attendance, record] }))
        }
      },

      getAttendance: (date) => {
        return get().attendance.filter(a => a.date === date)
      },

      addCalendarEntry: (date, contentName, city) => {
        const entry: CalendarEntry = {
          id: uuidv4(),
          date,
          contentName,
          city,
        }
        set(state => ({ calendarEntries: [...state.calendarEntries, entry] }))
      },

      updateCalendarEntry: (id, updates) => {
        set(state => ({
          calendarEntries: state.calendarEntries.map(e =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }))
      },

      getTodayEntry: () => {
        return get().calendarEntries.find(e => e.date === today())
      },

      addTeacherFile: (name) => {
        const file: TeacherCodeFile = {
          id: uuidv4(),
          name,
          content: '// Arquivo do Professor\nusing System;\n\nclass Program\n{\n    static void Main(string[] args)\n    {\n        Console.WriteLine("Exemplo do professor");\n    }\n}',
          lastModified: new Date().toISOString(),
        }
        set(state => ({ teacherFiles: [...state.teacherFiles, file] }))
        return file
      },

      updateTeacherFile: (fileId, content) => {
        set(state => ({
          teacherFiles: state.teacherFiles.map(f =>
            f.id === fileId ? { ...f, content, lastModified: new Date().toISOString() } : f
          ),
        }))
      },

      renameTeacherFile: (fileId, name) => {
        set(state => ({
          teacherFiles: state.teacherFiles.map(f => f.id === fileId ? { ...f, name } : f),
        }))
      },

      deleteTeacherFile: (fileId) => {
        set(state => ({ teacherFiles: state.teacherFiles.filter(f => f.id !== fileId) }))
      },
    }),
    {
      name: 'aula-csharp-store',
    }
  )
)

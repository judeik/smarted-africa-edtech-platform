import React, { useState, useEffect, useCallback } from 'react';
import {
  Star, BookOpen, User, Clock, ChevronDown, ChevronUp,
  Filter, Search, Loader2, AlertCircle, RefreshCw, GraduationCap
} from 'lucide-react';
import { translations } from '../utils/translations';
import { coursesApi } from '../lib/api';

export interface Course {
  id: string;
  _id?: string;
  title: string;
  instructor: string;
  basePrice: number;
  price?: number;
  description: string;
  shortDescription: string;
  image: string;
  rating: number;
  reviewCount: number;
  duration: string;
  level: string;
  examType: string;
  language: string;
  enrollmentCount?: number;
  reviews: Review[];
}

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

interface CoursesPageProps {
  currentLanguage: string;
  onSubscribe: (course: Course) => void;
  onWriteReview?: (courseId: string, courseTitle: string) => void;
}

const EXAM_TYPES = ['All', 'WAEC', 'JAMB', 'NECO', 'GCE', 'NCE', 'General'];
const LEVELS = ['All', 'beginner', 'intermediate', 'advanced'];
const VAT_RATE = 0.075;

// Fallback courses when API is unavailable (demo / offline mode)
const FALLBACK_COURSES: Course[] = [
  {
    id: 'waec-maths',
    title: 'WAEC Mathematics Mastery',
    instructor: 'Dr. Adebayo Johnson',
    basePrice: 5000,
    price: 5000,
    description: 'Comprehensive WAEC Mathematics preparation covering all topics from Algebra to Statistics. Includes 50+ practice tests, video explanations, and AI-powered doubt solving. Perfect for SS3 students aiming for A1 grades.',
    shortDescription: 'Master WAEC Mathematics with 50+ practice tests and AI support.',
    image: 'https://placehold.co/400x250/28a745/white?text=WAEC+Maths',
    rating: 4.8,
    reviewCount: 124,
    duration: '3 months',
    level: 'intermediate',
    examType: 'WAEC',
    language: 'en',
    enrollmentCount: 412,
    reviews: [{ id: 'r1', name: 'Chiamaka E.', rating: 5, comment: 'Scored A1 in WAEC Maths!', date: '2024-03-15' }],
  },
  {
    id: 'jamb-physics',
    title: 'JAMB Physics Crash Course',
    instructor: 'Prof. Fatima Ibrahim',
    basePrice: 7500,
    price: 7500,
    description: 'Intensive JAMB Physics preparation focusing on high-yield topics like Waves, Electricity, and Modern Physics. Includes timed mock exams and formula sheets.',
    shortDescription: 'Ace JAMB Physics with timed mocks and formula mastery.',
    image: 'https://placehold.co/400x250/20c997/white?text=JAMB+Physics',
    rating: 4.6,
    reviewCount: 89,
    duration: '2 months',
    level: 'intermediate',
    examType: 'JAMB',
    language: 'en',
    enrollmentCount: 287,
    reviews: [{ id: 'r2', name: 'Emmanuel O.', rating: 5, comment: 'Got 320 in JAMB overall!', date: '2024-04-02' }],
  },
  {
    id: 'neco-english',
    title: 'NECO English Language Excellence',
    instructor: 'Mrs. Grace Nwosu',
    basePrice: 4000,
    price: 4000,
    description: 'Master NECO English with focus on Comprehension, Lexis, and Essay Writing. Includes AI-powered essay feedback and past questions from 2015–2024.',
    shortDescription: 'Excel in NECO English with AI essay grading and oral practice.',
    image: 'https://placehold.co/400x250/17a2b8/white?text=NECO+English',
    rating: 4.9,
    reviewCount: 203,
    duration: '4 months',
    level: 'beginner',
    examType: 'NECO',
    language: 'en',
    enrollmentCount: 631,
    reviews: [{ id: 'r3', name: 'Aisha M.', rating: 5, comment: 'The AI explanations made grammar so much easier!', date: '2024-01-20' }],
  },
];

function normalizeCourse(raw: unknown): Course {
  const r = raw as Record<string, unknown>;
  return {
    id: (r._id as string) || (r.id as string),
    _id: (r._id as string) || (r.id as string),
    title: (r.title as string) || '',
    instructor: (r.instructor as string) || (r.author as unknown as Record<string, string>)?.name || 'SmartEd Team',
    basePrice: (r.price as number) || 0,
    price: (r.price as number) || 0,
    description: (r.description as string) || '',
    shortDescription: ((r.description as string) || '').slice(0, 120) + (((r.description as string) || '').length > 120 ? '…' : ''),
    image: (r.image as string) || `https://placehold.co/400x250/28a745/white?text=${encodeURIComponent((r.examType as string) || 'Course')}`,
    rating: (r.rating as number) || 4.5,
    reviewCount: (r.reviewCount as number) || 0,
    duration: (r.duration as string) || '3 months',
    level: (r.level as string) || 'beginner',
    examType: (r.examType as string) || 'General',
    language: (r.language as string) || 'en',
    enrollmentCount: (r.enrollmentCount as number) || 0,
    reviews: [],
  };
}

const CoursesPage: React.FC<CoursesPageProps> = ({ currentLanguage, onSubscribe, onWriteReview }) => {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: 1, limit: 50 };
      if (selectedExamType !== 'All') params.examType = selectedExamType;
      if (selectedLevel !== 'All') params.level = selectedLevel;
      const res = await coursesApi.list(params);
      const items = (res.data.items as unknown[]) || [];
      if (items.length === 0) {
        setCourses(FALLBACK_COURSES);
        setUsingFallback(true);
      } else {
        setCourses(items.map(normalizeCourse));
        setUsingFallback(false);
      }
    } catch {
      setCourses(FALLBACK_COURSES);
      setUsingFallback(true);
      setError('Using sample courses — connect the backend to see live content.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedExamType, selectedLevel]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const filtered = courses.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.examType.toLowerCase().includes(q);
  });

  const calculatePrice = (c: Course) => Math.round((c.price ?? c.basePrice) * (1 + VAT_RATE));

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-200 fill-current'}`} />
      ))}
      <span className="ml-1 text-sm text-gray-500">({rating.toFixed(1)})</span>
    </div>
  );

  const examTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      WAEC: 'bg-green-100 text-green-700',
      JAMB: 'bg-blue-100 text-blue-700',
      NECO: 'bg-purple-100 text-purple-700',
      GCE: 'bg-orange-100 text-orange-700',
      NCE: 'bg-teal-100 text-teal-700',
      General: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[type] || colors.General}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 pt-16">
      {/* Header */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-700 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{t.courses || 'Our Courses'}</h1>
              <p className="text-green-100">Exam-focused, AI-powered, offline-capable courses</p>
            </div>
            {usingFallback && (
              <div className="flex items-center gap-2 bg-yellow-500 bg-opacity-20 border border-yellow-300 text-yellow-100 px-3 py-2 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Demo mode — sample courses shown
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 bg-white shadow-sm sticky top-16 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, topics, exam types..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700 whitespace-nowrap"
          >
            <Filter className="w-4 h-4" />
            Filters {(selectedExamType !== 'All' || selectedLevel !== 'All') && '•'}
          </button>
          <button onClick={loadCourses} title="Refresh courses" className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="max-w-7xl mx-auto mt-3 flex flex-wrap gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Exam Type</p>
              <div className="flex flex-wrap gap-1.5">
                {EXAM_TYPES.map((et) => (
                  <button
                    key={et}
                    onClick={() => setSelectedExamType(et)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${selectedExamType === et ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-700 hover:border-green-400'}`}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Level</p>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setSelectedLevel(lv)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${selectedLevel === lv ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-700 hover:border-green-400'}`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Courses Grid */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No courses found</h3>
              <p className="text-gray-500">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">{filtered.length} course{filtered.length !== 1 ? 's' : ''} available</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((course) => (
                  <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                    <div className="h-48 bg-gray-100 overflow-hidden relative">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/400x250/28a745/white?text=${encodeURIComponent(course.examType)}`;
                        }}
                      />
                      <div className="absolute top-3 left-3">{examTypeBadge(course.examType)}</div>
                      {course.enrollmentCount && course.enrollmentCount > 0 ? (
                        <div className="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <User className="w-3 h-3" /> {course.enrollmentCount.toLocaleString()}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 leading-snug">{course.title}</h3>
                      </div>
                      {renderStars(course.rating)}

                      <div className="flex items-center text-sm text-gray-500 mt-2 mb-1">
                        <User className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span className="truncate">{course.instructor}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Clock className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span className="capitalize">{course.duration} · {course.level}</span>
                      </div>

                      <p className="text-gray-600 text-sm mb-3 flex-1">
                        {expandedCourse === course.id ? course.description : course.shortDescription}
                      </p>

                      {course.description.length > course.shortDescription.length && (
                        <button
                          onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                          className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center mb-3"
                        >
                          {expandedCourse === course.id ? 'Show less' : 'Read more'}
                          {expandedCourse === course.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                        </button>
                      )}

                      <div className="mb-4 mt-auto">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-gray-900">
                            ₦{calculatePrice(course).toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-400 line-through">
                            ₦{Math.round((course.price ?? course.basePrice) * 1.1).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-green-600 font-medium">Includes 7.5% VAT</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onSubscribe(course)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all text-sm"
                        >
                          Enroll Now
                        </button>
                        {onWriteReview && (
                          <button
                            onClick={() => onWriteReview(course.id, course.title)}
                            aria-label="Write a review"
                            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Star className="w-4 h-4 text-yellow-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Student reviews section */}
      {courses.some((c) => c.reviews.length > 0) && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Student Success Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.flatMap((c) =>
                c.reviews.map((rv) => (
                  <div key={rv.id} className="bg-gray-50 p-5 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900">{rv.name}</span>
                      <span className="text-xs text-gray-400">{rv.date}</span>
                    </div>
                    {renderStars(rv.rating)}
                    <p className="text-gray-600 mt-2 text-sm italic">"{rv.comment}"</p>
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <BookOpen className="w-3 h-3 mr-1" />{c.title}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="bg-gray-900 text-white py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} SmartEd Africa. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default CoursesPage;

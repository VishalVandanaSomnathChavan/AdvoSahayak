import { Link } from 'react-router-dom';

const CaseCard = ({ caseData }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{caseData.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(caseData.status)}`}>
          {caseData.status}
        </span>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-2">{caseData.description}</p>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-medium">Client:</span> {caseData.clientName}
        </p>
        <p className="text-sm text-gray-500">
          <span className="font-medium">Created:</span> {formatDate(caseData.createdAt)}
        </p>
      </div>

      <Link
        to={`/case/${caseData._id}`}
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        View Details
      </Link>
    </div>
  );
};

export default CaseCard;
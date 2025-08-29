// Global variables
let socket;
let surveys = [];
let currentPage = 'dashboard';
let editingSurveyId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    setupEventListeners();
    loadDashboard();
    showPage('dashboard');
});

// Socket.IO initialization
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        updateConnectionStatus(true);
        showToast('Connected to server', 'success');
    });
    
    socket.on('disconnect', function() {
        updateConnectionStatus(false);
        showToast('Disconnected from server', 'error');
    });
    
    // Real-time updates
    socket.on('survey_created', function(data) {
        showToast('New survey created', 'success');
        loadDashboard();
        if (currentPage === 'surveys') {
            loadSurveys();
        }
    });
    
    socket.on('survey_updated', function(data) {
        showToast('Survey updated', 'info');
        loadDashboard();
        if (currentPage === 'surveys') {
            loadSurveys();
        }
    });
    
    socket.on('survey_deleted', function(data) {
        showToast('Survey deleted', 'info');
        loadDashboard();
        if (currentPage === 'surveys') {
            loadSurveys();
        }
    });
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-indicator');
    const text = document.getElementById('connection-text');
    
    if (connected) {
        indicator.classList.remove('disconnected');
        text.textContent = 'Connected';
    } else {
        indicator.classList.add('disconnected');
        text.textContent = 'Disconnected';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            showPage(page);
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        filterSurveys(this.value);
    });
    
    // Status filter
    const statusFilter = document.getElementById('status-filter');
    statusFilter.addEventListener('change', function() {
        filterSurveysByStatus(this.value);
    });
    
    // New survey form
    const newSurveyForm = document.getElementById('new-survey-form');
    newSurveyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createSurvey();
    });
}

// Page navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.querySelector(`[data-page="${pageName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('page-title');
    const titles = {
        'dashboard': 'Dashboard',
        'surveys': 'Surveys',
        'new-survey': 'New Survey',
        'reports': 'Reports'
    };
    pageTitle.textContent = titles[pageName] || 'Dashboard';
    
    // Load page-specific content
    currentPage = pageName;
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'surveys':
            loadSurveys();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        
        updateDashboardStats(data);
        updateRecentSurveys(data.recentSurveys);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// Update dashboard statistics
function updateDashboardStats(data) {
    document.getElementById('total-surveys').textContent = data.totalSurveys || 0;
    
    // Update status counts
    const statusCounts = {};
    if (data.byStatus) {
        data.byStatus.forEach(item => {
            statusCounts[item.status] = item.count;
        });
    }
    
    document.getElementById('pending-surveys').textContent = statusCounts.pending || 0;
    document.getElementById('completed-surveys').textContent = statusCounts.completed || 0;
    document.getElementById('in-progress-surveys').textContent = statusCounts['in-progress'] || 0;
}

// Update recent surveys list
function updateRecentSurveys(recentSurveys) {
    const container = document.getElementById('recent-surveys-list');
    
    if (!recentSurveys || recentSurveys.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No surveys yet</h3>
                <p>Create your first survey to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentSurveys.map(survey => `
        <div class="survey-item" onclick="viewSurvey('${survey.id}')">
            <h4>${survey.customer_name}</h4>
            <p>${survey.property_address}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <span class="status-badge status-${survey.status}">${survey.status}</span>
                <small>${formatDate(survey.created_at)}</small>
            </div>
        </div>
    `).join('');
}

// Load surveys page
async function loadSurveys() {
    try {
        const response = await fetch('/api/surveys');
        surveys = await response.json();
        renderSurveysTable(surveys);
    } catch (error) {
        console.error('Error loading surveys:', error);
        showToast('Error loading surveys', 'error');
    }
}

// Render surveys table
function renderSurveysTable(surveysToRender) {
    const tbody = document.getElementById('surveys-table-body');
    
    if (!surveysToRender || surveysToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem;">
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <h3>No surveys found</h3>
                        <p>Create your first survey to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = surveysToRender.map(survey => `
        <tr>
            <td>
                <div>
                    <strong>${survey.customer_name}</strong>
                    ${survey.customer_email ? `<br><small>${survey.customer_email}</small>` : ''}
                </div>
            </td>
            <td>${survey.property_address}</td>
            <td>${survey.survey_date ? formatDate(survey.survey_date) : 'Not scheduled'}</td>
            <td>${survey.surveyor_name || 'Not assigned'}</td>
            <td>
                <span class="status-badge status-${survey.status}">${survey.status}</span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-view" onclick="viewSurvey('${survey.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-edit" onclick="editSurvey('${survey.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="deleteSurvey('${survey.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Filter surveys by search term
function filterSurveys(searchTerm) {
    if (!searchTerm) {
        renderSurveysTable(surveys);
        return;
    }
    
    const filtered = surveys.filter(survey => 
        survey.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (survey.customer_email && survey.customer_email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    renderSurveysTable(filtered);
}

// Filter surveys by status
function filterSurveysByStatus(status) {
    if (!status) {
        renderSurveysTable(surveys);
        return;
    }
    
    const filtered = surveys.filter(survey => survey.status === status);
    renderSurveysTable(filtered);
}

// Create new survey
async function createSurvey() {
    const form = document.getElementById('new-survey-form');
    const formData = new FormData(form);
    
    const surveyData = {
        customer_name: formData.get('customer_name'),
        customer_email: formData.get('customer_email'),
        customer_phone: formData.get('customer_phone'),
        property_address: formData.get('property_address'),
        property_type: formData.get('property_type'),
        current_heating_system: formData.get('current_heating_system'),
        survey_date: formData.get('survey_date'),
        surveyor_name: formData.get('surveyor_name'),
        notes: formData.get('notes')
    };
    
    try {
        const response = await fetch('/api/surveys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(surveyData)
        });
        
        if (response.ok) {
            showToast('Survey created successfully', 'success');
            form.reset();
            showPage('surveys');
        } else {
            const error = await response.json();
            showToast(error.error || 'Error creating survey', 'error');
        }
    } catch (error) {
        console.error('Error creating survey:', error);
        showToast('Error creating survey', 'error');
    }
}

// View survey details
async function viewSurvey(surveyId) {
    try {
        const response = await fetch(`/api/surveys/${surveyId}`);
        const data = await response.json();
        
        showSurveyModal(data);
    } catch (error) {
        console.error('Error loading survey details:', error);
        showToast('Error loading survey details', 'error');
    }
}

// Show survey modal
function showSurveyModal(data) {
    const modal = document.getElementById('survey-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = `Survey: ${data.survey.customer_name}`;
    
    modalBody.innerHTML = `
        <div class="survey-details">
            <div class="detail-section">
                <h3>Customer Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${data.survey.customer_name}</span>
                    </div>
                    ${data.survey.customer_email ? `
                        <div class="detail-item">
                            <label>Email:</label>
                            <span>${data.survey.customer_email}</span>
                        </div>
                    ` : ''}
                    ${data.survey.customer_phone ? `
                        <div class="detail-item">
                            <label>Phone:</label>
                            <span>${data.survey.customer_phone}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Property Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Address:</label>
                        <span>${data.survey.property_address}</span>
                    </div>
                    ${data.survey.property_type ? `
                        <div class="detail-item">
                            <label>Property Type:</label>
                            <span>${formatPropertyType(data.survey.property_type)}</span>
                        </div>
                    ` : ''}
                    ${data.survey.current_heating_system ? `
                        <div class="detail-item">
                            <label>Current Heating:</label>
                            <span>${formatHeatingSystem(data.survey.current_heating_system)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Survey Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge status-${data.survey.status}">${data.survey.status}</span>
                    </div>
                    ${data.survey.survey_date ? `
                        <div class="detail-item">
                            <label>Survey Date:</label>
                            <span>${formatDate(data.survey.survey_date)}</span>
                        </div>
                    ` : ''}
                    ${data.survey.surveyor_name ? `
                        <div class="detail-item">
                            <label>Surveyor:</label>
                            <span>${data.survey.surveyor_name}</span>
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <label>Created:</label>
                        <span>${formatDate(data.survey.created_at)}</span>
                    </div>
                </div>
            </div>
            
            ${data.survey.notes ? `
                <div class="detail-section">
                    <h3>Notes</h3>
                    <p>${data.survey.notes}</p>
                </div>
            ` : ''}
            
            ${data.details && data.details.length > 0 ? `
                <div class="detail-section">
                    <h3>Survey Details</h3>
                    <div class="details-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Room</th>
                                    <th>Type</th>
                                    <th>Current Insulation</th>
                                    <th>Recommended</th>
                                    <th>Est. Cost</th>
                                    <th>Potential Savings</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.details.map(detail => `
                                    <tr>
                                        <td>${detail.room_name}</td>
                                        <td>${detail.room_type}</td>
                                        <td>${detail.current_insulation}</td>
                                        <td>${detail.recommended_improvements}</td>
                                        <td>£${detail.estimated_cost?.toLocaleString() || 'N/A'}</td>
                                        <td>£${detail.potential_savings?.toLocaleString() || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn btn-primary" onclick="editSurvey('${data.survey.id}'); closeModal();">Edit Survey</button>
        </div>
    `;
    
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('survey-modal');
    modal.classList.remove('active');
}

// Edit survey functionality
async function editSurvey(surveyId) {
    try {
        const response = await fetch(`/api/surveys/${surveyId}`);
        const data = await response.json();
        
        if (response.ok) {
            editingSurveyId = surveyId;
            showEditSurveyForm(data.survey);
        } else {
            showToast('Error loading survey for editing', 'error');
        }
    } catch (error) {
        console.error('Error loading survey for editing:', error);
        showToast('Error loading survey for editing', 'error');
    }
}

// Show edit survey form
function showEditSurveyForm(survey) {
    // Create edit form modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'edit-survey-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Survey: ${survey.customer_name}</h2>
                <button class="modal-close" onclick="closeEditModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="edit-survey-form" class="survey-form">
                    <div class="form-grid">
                        <div class="form-section">
                            <h3>Customer Information</h3>
                            <div class="form-group">
                                <label for="edit-customer-name">Customer Name *</label>
                                <input type="text" id="edit-customer-name" name="customer_name" value="${survey.customer_name}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-customer-email">Email</label>
                                <input type="email" id="edit-customer-email" name="customer_email" value="${survey.customer_email || ''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-customer-phone">Phone</label>
                                <input type="tel" id="edit-customer-phone" name="customer_phone" value="${survey.customer_phone || ''}">
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>Property Information</h3>
                            <div class="form-group">
                                <label for="edit-property-address">Property Address *</label>
                                <textarea id="edit-property-address" name="property_address" required>${survey.property_address}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="edit-property-type">Property Type</label>
                                <select id="edit-property-type" name="property_type">
                                    <option value="">Select Property Type</option>
                                    <option value="detached" ${survey.property_type === 'detached' ? 'selected' : ''}>Detached House</option>
                                    <option value="semi-detached" ${survey.property_type === 'semi-detached' ? 'selected' : ''}>Semi-Detached House</option>
                                    <option value="terraced" ${survey.property_type === 'terraced' ? 'selected' : ''}>Terraced House</option>
                                    <option value="flat" ${survey.property_type === 'flat' ? 'selected' : ''}>Flat/Apartment</option>
                                    <option value="bungalow" ${survey.property_type === 'bungalow' ? 'selected' : ''}>Bungalow</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-current-heating">Current Heating System</label>
                                <select id="edit-current-heating" name="current_heating_system">
                                    <option value="">Select Heating System</option>
                                    <option value="gas-boiler" ${survey.current_heating_system === 'gas-boiler' ? 'selected' : ''}>Gas Boiler</option>
                                    <option value="oil-boiler" ${survey.current_heating_system === 'oil-boiler' ? 'selected' : ''}>Oil Boiler</option>
                                    <option value="electric" ${survey.current_heating_system === 'electric' ? 'selected' : ''}>Electric Heating</option>
                                    <option value="heat-pump" ${survey.current_heating_system === 'heat-pump' ? 'selected' : ''}>Heat Pump</option>
                                    <option value="storage-heaters" ${survey.current_heating_system === 'storage-heaters' ? 'selected' : ''}>Storage Heaters</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>Survey Details</h3>
                            <div class="form-group">
                                <label for="edit-survey-date">Survey Date</label>
                                <input type="date" id="edit-survey-date" name="survey_date" value="${survey.survey_date || ''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-surveyor-name">Surveyor Name</label>
                                <input type="text" id="edit-surveyor-name" name="surveyor_name" value="${survey.surveyor_name || ''}">
                            </div>
                            <div class="form-group">
                                <label for="edit-survey-status">Status</label>
                                <select id="edit-survey-status" name="status">
                                    <option value="pending" ${survey.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="in-progress" ${survey.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="completed" ${survey.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="cancelled" ${survey.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-survey-notes">Notes</label>
                                <textarea id="edit-survey-notes" name="notes" rows="4">${survey.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Survey</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for form submission
    document.getElementById('edit-survey-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateSurvey();
    });
}

// Update survey
async function updateSurvey() {
    if (!editingSurveyId) {
        showToast('No survey selected for editing', 'error');
        return;
    }
    
    const form = document.getElementById('edit-survey-form');
    const formData = new FormData(form);
    
    const surveyData = {
        customer_name: formData.get('customer_name'),
        customer_email: formData.get('customer_email'),
        customer_phone: formData.get('customer_phone'),
        property_address: formData.get('property_address'),
        property_type: formData.get('property_type'),
        current_heating_system: formData.get('current_heating_system'),
        survey_date: formData.get('survey_date'),
        surveyor_name: formData.get('surveyor_name'),
        status: formData.get('status'),
        notes: formData.get('notes')
    };
    
    try {
        const response = await fetch(`/api/surveys/${editingSurveyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(surveyData)
        });
        
        if (response.ok) {
            showToast('Survey updated successfully', 'success');
            closeEditModal();
            
            // Refresh the current page data
            if (currentPage === 'dashboard') {
                loadDashboard();
            } else if (currentPage === 'surveys') {
                loadSurveys();
            }
        } else {
            const error = await response.json();
            showToast(error.error || 'Error updating survey', 'error');
        }
    } catch (error) {
        console.error('Error updating survey:', error);
        showToast('Error updating survey', 'error');
    }
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-survey-modal');
    if (modal) {
        modal.remove();
    }
    editingSurveyId = null;
}

// Delete survey
async function deleteSurvey(surveyId) {
    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/surveys/${surveyId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Survey deleted successfully', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Error deleting survey', 'error');
        }
    } catch (error) {
        console.error('Error deleting survey:', error);
        showToast('Error deleting survey', 'error');
    }
}

// Load reports page (placeholder)
function loadReports() {
    showToast('Reports functionality coming soon', 'info');
}

// Export data
function exportData() {
    // Create CSV content
    const headers = ['Customer Name', 'Email', 'Phone', 'Property Address', 'Property Type', 'Heating System', 'Survey Date', 'Surveyor', 'Status', 'Created Date'];
    const csvContent = [
        headers.join(','),
        ...surveys.map(survey => [
            `"${survey.customer_name}"`,
            `"${survey.customer_email || ''}"`,
            `"${survey.customer_phone || ''}"`,
            `"${survey.property_address}"`,
            `"${survey.property_type || ''}"`,
            `"${survey.current_heating_system || ''}"`,
            `"${survey.survey_date || ''}"`,
            `"${survey.surveyor_name || ''}"`,
            `"${survey.status}"`,
            `"${survey.created_at}"`
        ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eco4-surveys-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('Data exported successfully', 'success');
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatPropertyType(type) {
    const types = {
        'detached': 'Detached House',
        'semi-detached': 'Semi-Detached House',
        'terraced': 'Terraced House',
        'flat': 'Flat/Apartment',
        'bungalow': 'Bungalow'
    };
    return types[type] || type;
}

function formatHeatingSystem(system) {
    const systems = {
        'gas-boiler': 'Gas Boiler',
        'oil-boiler': 'Oil Boiler',
        'electric': 'Electric Heating',
        'heat-pump': 'Heat Pump',
        'storage-heaters': 'Storage Heaters'
    };
    return systems[system] || system;
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 
                 'fas fa-info-circle';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Add some CSS for the survey details modal
const additionalStyles = `
    .survey-details {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .detail-section h3 {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #1e293b;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0.5rem;
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .detail-item label {
        font-weight: 500;
        color: #64748b;
        font-size: 0.875rem;
    }
    
    .detail-item span {
        color: #1e293b;
    }
    
    .details-table {
        overflow-x: auto;
    }
    
    .details-table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
    }
    
    .details-table th,
    .details-table td {
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
        text-align: left;
    }
    
    .details-table th {
        background: #f8fafc;
        font-weight: 600;
    }
    
    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

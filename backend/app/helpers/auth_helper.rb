module AuthHelper
  def current_user
    return nil unless session[:user_id]

    @current_user ||= User.find_by(user_id: session[:user_id])
  end

  def require_admin!
    halt_error(401, 'Login required') unless current_user&.role == 'admin'
  end
end

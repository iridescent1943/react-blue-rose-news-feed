bind "tcp://#{ENV.fetch('HOST', '0.0.0.0')}:#{ENV.fetch('PORT', 3000)}"
environment ENV.fetch('RACK_ENV', 'development')

workers Integer(ENV.fetch('WEB_CONCURRENCY', 0))
max_threads = Integer(ENV.fetch('MAX_THREADS', 5))
threads max_threads, max_threads

preload_app!

before_fork do
  ActiveRecord::Base.connection_pool.disconnect! if defined?(ActiveRecord::Base)
end

on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord::Base)
end

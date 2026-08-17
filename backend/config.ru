require_relative 'config/environment'

controllers = ApplicationController.descendants
controllers.each { |controller| use controller }

run ApplicationController

package com.hospital.blood_plus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling 
public class BloodPlusApplication {

	public static void main(String[] args) {
		SpringApplication.run(BloodPlusApplication.class, args);
	}

}
